import { GoogleGenAI, Modality, Type } from "@google/genai";
import { FullStory, Language, EmotionAnalysisResult, Emotion, StoryScene } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const parseJSON = (text: string) => {
  try {
    // Remove markdown code blocks if present
    const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse JSON:", text);
    // Fallback: try to find the first '{' and last '}'
    try {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      }
    } catch (e2) {
      console.error("Fallback JSON parsing failed", e2);
    }
    return null;
  }
};

// --- Storage Helpers for Offline Mode ---
const STORAGE_KEY = 'storyweaver_offline_stories';

export const saveStoryOffline = (story: FullStory) => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const stories: FullStory[] = saved ? JSON.parse(saved) : [];
    // Keep last 5, filter duplicates
    const filtered = stories.filter(s => s.id !== story.id);
    const updated = [story, ...filtered].slice(0, 5);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Storage full or unavailable", e);
  }
};

export const getOfflineStories = (): FullStory[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

export const VOICES = [
  { id: 'Puck', name: 'Puck (Playful)', gender: 'Male' },
  { id: 'Kore', name: 'Kore (Calm)', gender: 'Female' },
  { id: 'Fenrir', name: 'Fenrir (Deep)', gender: 'Male' },
  { id: 'Zephyr', name: 'Zephyr (Soft)', gender: 'Female' },
  { id: 'Charon', name: 'Charon (Formal)', gender: 'Male' },
];

/**
 * Generates a complete 4-5 scene story with title and quiz.
 */
export const generateFullStory = async (
  prompt: string,
  age: number,
  language: Language
): Promise<FullStory | null> => {
  const ai = getAI();
  const modelId = "gemini-3-pro-preview";

  const systemInstruction = `
    You are StoryWeaver, a world-class educational storyteller.
    Create a captivating, educational story for a ${age}-year-old child.
    Language: ${language}.
    
    Structure:
    1. Title
    2. 4 distinct Scenes. Each scene needs 60-80 words of narrative text and a detailed image generation prompt.
    3. 3 Quiz questions at the end to test comprehension.

    Output JSON strictly matching this schema:
    {
      "title": "string",
      "scenes": [
        { "text": "Narrative text...", "imagePrompt": "Visual description...", "mediaType": "image" }
      ],
      "quiz": [
        { 
          "question": "string", 
          "options": [{"text": "string", "isCorrect": boolean}], 
          "feedback": "string" 
        }
      ]
    }
    Make sure "mediaType" is always "image". Use "video" only if the scene involves high-speed action (racing, flying).
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `User Prompt: ${prompt}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 2048 } // High budget for creativity + logic
      }
    });

    const data = parseJSON(response.text || "{}");
    if (!data || !data.scenes) throw new Error("Invalid story data");

    const story: FullStory = {
      id: crypto.randomUUID(),
      title: data.title,
      scenes: data.scenes.map((s: any) => ({ ...s, id: crypto.randomUUID() })),
      quiz: data.quiz,
      timestamp: Date.now(),
      language
    };

    saveStoryOffline(story);
    return story;

  } catch (error) {
    console.error("Story Generation Error:", error);
    return null;
  }
};

/**
 * Simplifies a specific text content if confusion is detected.
 */
export const simplifyContent = async (text: string, language: Language): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Simplify this text for a 5-year-old. Keep it short and encouraging. Language: ${language}.\n\nText: "${text}"`,
    });
    return response.text || text;
  } catch (e) {
    return text;
  }
};

/**
 * Generates visuals (Image or Video)
 */
export const generateVisuals = async (prompt: string, type: 'image' | 'video'): Promise<string | undefined> => {
  const ai = getAI();
  try {
    if (type === 'video') {
       // Veo generation
       let operation = await ai.models.generateVideos({
         model: 'veo-3.1-fast-generate-preview',
         prompt: prompt + ", 3d animated style, disney pixar style, bright colors",
         config: {
           numberOfVideos: 1,
           resolution: '720p',
           aspectRatio: '16:9'
         }
       });

       while (!operation.done) {
         await new Promise(resolve => setTimeout(resolve, 8000));
         operation = await ai.operations.getVideosOperation({operation});
       }

       const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
       if (downloadLink) {
         const res = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
         const blob = await res.blob();
         return URL.createObjectURL(blob);
       }
    } else {
      // Gemini 3 Pro Image
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt + ", highly detailed, magical atmosphere, digital art, 8k resolution, soft lighting" }]
        },
        config: {
          imageConfig: { aspectRatio: "16:9", imageSize: "1K" }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (error) {
    console.error("Visual Generation Error:", error);
    return undefined; // UI will show placeholder
  }
};

/**
 * Analyzes emotion from webcam frame.
 */
export const analyzeLearnerEmotion = async (base64Image: string): Promise<EmotionAnalysisResult> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Analyze the student's face. Return JSON: { \"emotion\": \"CONFUSED\" | \"HAPPY\" | \"BORED\" | \"NEUTRAL\", \"confidence\": number (0-1) }. If they look puzzled, frowning, or scratching head, label CONFUSED." }
        ]
      },
      config: { responseMimeType: "application/json" }
    });

    const data = parseJSON(response.text || "{}");
    return {
      emotion: (data.emotion as Emotion) || Emotion.NEUTRAL,
      confidence: data.confidence || 0,
      needsSimplification: data.emotion === 'CONFUSED' && (data.confidence || 0) > 0.6
    };
  } catch (error) {
    return { emotion: Emotion.NEUTRAL, confidence: 0, needsSimplification: false };
  }
};

/**
 * TTS
 */
export const generateSpeech = async (text: string, language: Language, voiceName?: string): Promise<ArrayBuffer | null> => {
  const ai = getAI();
  try {
    // Default strategies for languages if no specific voice selected
    let selectedVoice = voiceName;
    if (!selectedVoice) {
       selectedVoice = language === Language.HINDI ? 'Puck' : (language === Language.SPANISH ? 'Fenrir' : 'Kore');
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } }
      }
    });
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64) {
      return Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
    }
    return null;
  } catch (e) { return null; }
}