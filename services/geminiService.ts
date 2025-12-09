import { GoogleGenAI, Modality, Type } from "@google/genai";
import { FullStory, Language, EmotionAnalysisResult, Emotion, StoryScene } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Robust ID generator that works in all contexts (unlike crypto.randomUUID)
const generateUUID = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

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

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// --- Storage Helpers for Offline Mode ---
const STORAGE_KEY = 'storyweaver_offline_stories';

export const saveStoryOffline = (story: FullStory) => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    let stories: FullStory[] = saved ? JSON.parse(saved) : [];
    
    // Remove existing version of this story if it exists (to update it)
    stories = stories.filter(s => s.id !== story.id);
    
    // Add new/updated story to the front
    const updated = [story, ...stories].slice(0, 5); // Keep max 5
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn("LocalStorage full. Could not cache story media.");
      // Optional: Try to clear older stories or save without media as fallback
    } else {
      console.warn("Storage unavailable", e);
    }
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

export const updateStorySceneMedia = (storyId: string, sceneId: string, mediaUrl: string) => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    
    const stories: FullStory[] = JSON.parse(saved);
    const storyIndex = stories.findIndex(s => s.id === storyId);
    
    if (storyIndex !== -1) {
      const sceneIndex = stories[storyIndex].scenes.findIndex(s => s.id === sceneId);
      if (sceneIndex !== -1) {
        stories[storyIndex].scenes[sceneIndex].mediaUrl = mediaUrl;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
      }
    }
  } catch (e) {
    console.warn("Failed to update offline story media", e);
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
 * Generates a complete 5 scene story with title and quiz.
 * Falls back to Flash model if Pro is unavailable.
 */
export const generateFullStory = async (
  prompt: string,
  age: number,
  language: Language
): Promise<FullStory | null> => {
  const ai = getAI();
  
  const langInstruction = language === Language.HINDI 
    ? "Hinglish (Conversational mix of Hindi and English, easy for Indian students)" 
    : language;

  const systemInstruction = `
    You are StoryWeaver AI, an educational assistant that explains difficult topics using simple stories.
    User Topic: ${prompt}

    Your task:
    1. Create a short, engaging story in ${langInstruction}.
    2. Break the topic into 5 scenes. Each scene must have:
       - A short paragraph (easy language)
       - One image idea (for AI image generation)
    3. Keep the story age-friendly and easy for students (age ${age}).
    4. Add 3 simple quiz questions at the end.
    5. Add 5 short exam notes in bullet points (Key Takeaways).
    6. If the topic is complex, explain it with a real-life example in the story.

    Output format (strictly JSON):
    {
      "title": "Story Title",
      "scenes": [
        { "text": "Scene narrative...", "imagePrompt": "Visual description...", "mediaType": "image" }
      ],
      "quiz": [
        { 
          "question": "Question text?", 
          "options": [{"text": "Option A", "isCorrect": boolean}, {"text": "Option B", "isCorrect": boolean}, ...], 
          "feedback": "Short explanation." 
        }
      ],
      "notes": ["Note 1", "Note 2", "Note 3", "Note 4", "Note 5"]
    }
    Make sure "mediaType" is always "image". Use "video" only if the scene involves high-speed action.
  `;

  // Helper to execute generation
  const generate = async (model: string, budget?: number) => {
    return await ai.models.generateContent({
      model: model,
      contents: `User Prompt: ${prompt}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        thinkingConfig: budget ? { thinkingBudget: budget } : undefined
      }
    });
  };

  try {
    let response;
    try {
      // Try Gemini 3 Pro
      response = await generate("gemini-3-pro-preview", 2048);
    } catch (proError) {
      console.warn("Gemini 3 Pro failed, falling back to Flash", proError);
      // Fallback to Flash
      response = await generate("gemini-2.5-flash");
    }

    const data = parseJSON(response.text || "{}");
    if (!data || !data.scenes) throw new Error("Invalid story data");

    const story: FullStory = {
      id: generateUUID(),
      title: data.title,
      scenes: data.scenes.map((s: any) => ({ ...s, id: generateUUID() })),
      quiz: data.quiz,
      notes: data.notes,
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
 * Implements fallback strategies for robustness.
 * Returns Base64 Data URL for persistence.
 */
export const generateVisuals = async (prompt: string, type: 'image' | 'video'): Promise<string | undefined> => {
  const ai = getAI();
  
  // Helper for Flash Image (Fallback)
  const generateFlashImage = async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt + ", highly detailed, magical atmosphere, digital art, 8k resolution, soft lighting" }]
        },
      });
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    } catch (e) {
      console.error("Flash image fallback failed", e);
    }
    return undefined;
  };

  try {
    // Try Video (Veo) if requested
    if (type === 'video') {
       try {
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
           await new Promise(resolve => setTimeout(resolve, 5000));
           operation = await ai.operations.getVideosOperation({operation});
         }

         const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
         if (downloadLink) {
           const res = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
           const blob = await res.blob();
           // Convert Blob to Base64 for offline persistence
           return await blobToBase64(blob);
         }
       } catch (veoError) {
         console.warn("Veo generation failed or not permitted, falling back to image generation.", veoError);
         // Fallback to image generation loop
       }
    }

    // Try High-Quality Image (Gemini 3 Pro Image)
    try {
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
    } catch (proError) {
        console.warn("Gemini 3 Pro Image failed (403/404), falling back to Flash Image.", proError);
        return await generateFlashImage();
    }
    
    return await generateFlashImage();

  } catch (error) {
    console.error("Visual Generation Critical Error:", error);
    return undefined;
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