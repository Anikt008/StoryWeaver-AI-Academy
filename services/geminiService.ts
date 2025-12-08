import { GoogleGenAI, Modality } from "@google/genai";
import { StorySegment, Language, EmotionAnalysisResult, Emotion } from "../types";

// --- Helper to parse JSON from AI response ---
const parseJSON = (text: string) => {
  try {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1] : text;
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Failed to parse JSON from Gemini:", text);
    return null;
  }
};

const getAI = () => new GoogleGenAI({ apiKey: (process.env.API_KEY || "").trim() });

/**
 * Generates the next story segment based on previous context, user input, and current difficulty.
 * Uses Gemini 3 Pro with Thinking Config for educational scaffolding.
 */
export const generateStorySegment = async (
  prompt: string,
  history: string[],
  language: Language,
  simplify: boolean
): Promise<StorySegment | null> => {
  const ai = getAI();
  const modelId = "gemini-3-pro-preview";

  const difficultyInstruction = simplify
    ? "The user seems confused. SIMPLIFY the language significantly. Use shorter sentences and simpler vocabulary."
    : "Maintain an engaging, educational tone suitable for a 10-12 year old.";

  const systemInstruction = `
    You are StoryWeaver, an advanced educational AI for kids.
    Your goal is to teach concepts through interactive storytelling.
    Language: ${language}.
    ${difficultyInstruction}
    
    Output JSON format only:
    {
      "text": "The narrative text...",
      "mediaPrompt": "A detailed visual description for image/video generation...",
      "mediaType": "image" or "video" (use video for action scenes, image for descriptive),
      "quiz": {
        "question": "A relevant question...",
        "options": [{"text": "...", "isCorrect": boolean}, ...],
        "feedback": "Explanation of the answer..."
      },
      "difficultyLevel": "simple" | "standard"
    }
  `;

  try {
    const userMessage = `
      Current Story Context: ${history.join('\n')}
      User Input/Action: ${prompt}
      
      Generate the next segment.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: userMessage,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 1024 } // Use thinking for educational structuring
      }
    });

    const data = parseJSON(response.text || "{}");
    if (!data) throw new Error("Invalid JSON response");

    return {
      id: crypto.randomUUID(),
      ...data
    };

  } catch (error) {
    console.error("Story Generation Error:", error);
    return null;
  }
};

/**
 * Generates visual content. Uses gemini-3-pro-image-preview for images
 * and Veo for videos.
 */
export const generateVisuals = async (prompt: string, type: 'image' | 'video'): Promise<string | undefined> => {
  const ai = getAI();
  try {
    if (type === 'video') {
       // Veo generation
       let operation = await ai.models.generateVideos({
         model: 'veo-3.1-fast-generate-preview',
         prompt: prompt + ", high quality, kid friendly style, 3d render",
         config: {
           numberOfVideos: 1,
           resolution: '720p',
           aspectRatio: '16:9'
         }
       });

       while (!operation.done) {
         await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
         operation = await ai.operations.getVideosOperation({operation});
       }

       const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
       if (downloadLink) {
         // Proxy fetch to get blob URL to display in img/video tag
         // We must append the API key manually for the download link
         const res = await fetch(`${downloadLink}&key=${(process.env.API_KEY || "").trim()}`);
         if (!res.ok) {
           throw new Error(`Failed to fetch video: ${res.statusText}`);
         }
         const blob = await res.blob();
         return URL.createObjectURL(blob);
       }
       return undefined;

    } else {
      // Image Generation using Gemini 3 Pro Image
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt + ", vivid colors, educational illustration style, high definition" }]
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "1K"
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return undefined;
    }
  } catch (error) {
    console.error("Visual Generation Error:", error);
    return "https://picsum.photos/800/450"; // Fallback
  }
};

/**
 * Analyzes a webcam frame to detect emotion (Confusion vs Engagement).
 * Uses gemini-2.5-flash for speed.
 */
export const analyzeLearnerEmotion = async (base64Image: string): Promise<EmotionAnalysisResult> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Analyze the facial expression of this student learning. Are they CONFUSED, BORED, HAPPY, or NEUTRAL? If they look confused or frustrated, set needsSimplification to true. Return JSON: { \"emotion\": string, \"needsSimplification\": boolean }" }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const data = parseJSON(response.text || "{}");
    return {
      emotion: (data.emotion as Emotion) || Emotion.NEUTRAL,
      confidence: 0.9,
      needsSimplification: data.needsSimplification || false
    };

  } catch (error) {
    console.error("Emotion Analysis Error:", error);
    return { emotion: Emotion.NEUTRAL, confidence: 0, needsSimplification: false };
  }
};

/**
 * Generates Speech from text using Gemini TTS.
 */
export const generateSpeech = async (text: string, language: Language): Promise<ArrayBuffer | null> => {
  const ai = getAI();
  try {
    const voiceName = language === Language.HINDI ? 'Puck' : (language === Language.SPANISH ? 'Fenrir' : 'Kore');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }
    return null;
  } catch (e) {
    console.error("TTS Error", e);
    return null;
  }
}