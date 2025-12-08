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

export interface StorySegment {
  id: string;
  text: string;
  mediaPrompt: string; // Used to generate image/video
  mediaType: 'image' | 'video'; // Determined by AI
  mediaUrl?: string; // Filled after generation
  quiz?: Quiz;
  difficultyLevel: 'simple' | 'standard' | 'advanced';
}

export interface UserProgress {
  badges: string[];
  storiesCompleted: number;
  quizzesPassed: number;
  totalPoints: number;
  literacyScore: number[]; // History for chart
  engagementScore: number[]; // History for chart
}

export interface EmotionAnalysisResult {
  emotion: Emotion;
  confidence: number;
  needsSimplification: boolean;
}

// Global definition for AI Studio environment
declare global {
  interface AIStudio {
    hasSelectedApiKey(): Promise<boolean>;
    openSelectKey(): Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}