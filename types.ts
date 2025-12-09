export enum AppMode {
  HOME = 'HOME',
  STORY = 'STORY',
  DASHBOARD = 'DASHBOARD'
}

export enum Language {
  ENGLISH = 'English',
  HINDI = 'Hindi',
  SPANISH = 'Spanish'
}

export enum Emotion {
  CONFUSED = 'CONFUSED',
  HAPPY = 'HAPPY',
  BORED = 'BORED',
  NEUTRAL = 'NEUTRAL',
  SURPRISED = 'SURPRISED'
}

export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export interface Quiz {
  question: string;
  options: QuizOption[];
  feedback: string;
}

export interface StoryScene {
  id: string;
  text: string;
  imagePrompt: string;
  mediaUrl?: string;
  mediaType: 'image' | 'video';
  voiceAudio?: ArrayBuffer; // Cache for TTS
}

export interface FullStory {
  id: string;
  title: string;
  scenes: StoryScene[];
  quiz: Quiz[];
  notes?: string[]; // Exam notes/Key takeaways
  timestamp: number;
  language: Language;
}

export interface UserProgress {
  badges: string[];
  storiesCompleted: number;
  quizzesPassed: number;
  totalPoints: number;
  literacyScore: number[];
  engagementScore: number[];
}

export interface EmotionAnalysisResult {
  emotion: Emotion;
  confidence: number;
  needsSimplification: boolean;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
    confetti: any;
    // aistudio property is provided by external type definition
  }
}