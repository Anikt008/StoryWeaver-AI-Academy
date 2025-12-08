import React, { useState, useEffect } from 'react';
import { AppMode, Language, UserProgress, EmotionAnalysisResult, Emotion } from './types';
import StoryInterface from './components/StoryInterface';
import WebcamMonitor from './components/WebcamMonitor';
import Dashboard from './components/Dashboard';
import { Compass, LayoutDashboard, Globe, Sparkles, Lock, Key } from 'lucide-react';

// Mock initial data
const INITIAL_PROGRESS: UserProgress = {
  badges: ['Space Explorer', 'Dino Expert'],
  storiesCompleted: 12,
  quizzesPassed: 34,
  totalPoints: 1250,
  literacyScore: [65, 68, 72, 70, 75, 78, 82, 85],
  engagementScore: [70, 60, 80, 85, 90, 88, 92, 95]
};

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [progress, setProgress] = useState<UserProgress>(INITIAL_PROGRESS);
  const [storyPrompt, setStoryPrompt] = useState("");
  const [emotionState, setEmotionState] = useState<EmotionAnalysisResult>({
    emotion: Emotion.NEUTRAL,
    confidence: 0,
    needsSimplification: false
  });
  
  // Webcam is active primarily during Story Mode to monitor engagement
  const isWebcamActive = mode === AppMode.STORY;

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        // Fallback for environments where window.aistudio is not available
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Assume success to avoid race conditions
      setHasApiKey(true);
    }
  };

  const handleStartStory = (prompt: string) => {
    setStoryPrompt(prompt);
    setMode(AppMode.STORY);
  };

  const updateStats = (correct: boolean) => {
    setProgress(prev => ({
      ...prev,
      quizzesPassed: correct ? prev.quizzesPassed + 1 : prev.quizzesPassed,
      totalPoints: correct ? prev.totalPoints + 50 : prev.totalPoints + 10,
      engagementScore: [...prev.engagementScore, emotionState.emotion === Emotion.HAPPY ? 95 : 80]
    }));
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="bg-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-fredoka text-indigo-900">Unlock Adventure</h1>
          <p className="text-slate-600">
            To create magical stories with Veo videos and Gemini 3 visuals, please connect your Google API Key.
          </p>
          <button 
            onClick={handleSelectKey}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-transform hover:scale-105"
          >
            <Key className="w-5 h-5" />
            Connect API Key
          </button>
          <p className="text-xs text-slate-400">
            Requires a paid project for Veo & Gemini 3 Preview models. 
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-indigo-600 ml-1">
              Billing Info
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMode(AppMode.HOME)}>
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-fredoka font-bold text-indigo-900">StoryWeaver AI</span>
          </div>

          <div className="flex items-center gap-4">
             {/* Language Selector */}
             <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600">
                    <Globe className="w-4 h-4" />
                    <span className="text-sm font-medium">{language}</span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-xl border border-slate-100 hidden group-hover:block p-2">
                    {Object.values(Language).map(l => (
                        <button 
                            key={l} 
                            onClick={() => setLanguage(l)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${language === l ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50'}`}
                        >
                            {l}
                        </button>
                    ))}
                </div>
             </div>

            <button 
              onClick={() => setMode(mode === AppMode.DASHBOARD ? AppMode.HOME : AppMode.DASHBOARD)}
              className={`p-2 rounded-xl transition-colors ${mode === AppMode.DASHBOARD ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-indigo-600'}`}
            >
              <LayoutDashboard className="w-6 h-6" />
            </button>
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                J
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {mode === AppMode.HOME && (
          <div className="max-w-5xl mx-auto px-6 py-12">
            <div className="text-center mb-16 space-y-4">
                <span className="inline-block px-4 py-1 rounded-full bg-green-100 text-green-700 text-sm font-bold tracking-wide uppercase">
                    Powered by Gemini 3 Pro
                </span>
                <h1 className="text-5xl md:text-6xl font-fredoka text-indigo-900 leading-tight">
                    Where will your <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">imagination</span> go today?
                </h1>
                <p className="text-xl text-slate-500 max-w-2xl mx-auto">
                    Create interactive stories with AI. Learn science, history, and more through magical adventures tailored just for you.
                </p>
            </div>

            {/* Prompt Starter */}
            <div className="max-w-3xl mx-auto bg-white p-2 rounded-[2rem] shadow-2xl shadow-indigo-100 border border-slate-100 flex items-center p-4 gap-4 transform transition hover:scale-[1.01] duration-300">
                <input 
                    type="text" 
                    placeholder="E.g., A robot exploring Mars..." 
                    className="flex-1 bg-transparent px-4 text-xl outline-none text-slate-700 placeholder:text-slate-300"
                    onChange={(e) => setStoryPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStartStory(storyPrompt)}
                />
                <button 
                    onClick={() => handleStartStory(storyPrompt)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-[1.5rem] font-bold text-lg flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-200"
                >
                    <Sparkles className="w-5 h-5" />
                    Start Adventure
                </button>
            </div>

            {/* Quick Starters */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { title: "Dinosaurs in Space", color: "bg-orange-100", text: "text-orange-700" },
                    { title: "Deep Sea Mystery", color: "bg-blue-100", text: "text-blue-700" },
                    { title: "Microscopic World", color: "bg-green-100", text: "text-green-700" }
                ].map((item, i) => (
                    <button 
                        key={i}
                        onClick={() => handleStartStory(item.title)}
                        className={`${item.color} p-6 rounded-3xl text-left hover:opacity-80 transition-opacity`}
                    >
                        <h3 className={`text-xl font-bold ${item.text} font-fredoka`}>{item.title}</h3>
                        <p className={`text-sm ${item.text} opacity-75 mt-2`}>Tap to start this story</p>
                    </button>
                ))}
            </div>
            
            {/* Features Showcase */}
            <div className="mt-24 text-center">
                 <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-8">Advanced Features</p>
                 <div className="flex flex-wrap justify-center gap-8 opacity-70">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 bg-indigo-500 rounded-full"></div>Real-time Adaptation</div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 bg-purple-500 rounded-full"></div>Veo Video Generation</div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 bg-pink-500 rounded-full"></div>Emotional Intelligence</div>
                 </div>
            </div>
          </div>
        )}

        {mode === AppMode.STORY && (
          <StoryInterface 
            initialPrompt={storyPrompt} 
            language={language}
            onComplete={() => setMode(AppMode.DASHBOARD)}
            onUpdateStats={updateStats}
            emotionState={emotionState}
          />
        )}

        {mode === AppMode.DASHBOARD && (
          <Dashboard progress={progress} />
        )}
      </main>

      <WebcamMonitor 
        isActive={isWebcamActive} 
        onEmotionDetected={setEmotionState} 
      />
    </div>
  );
};

export default App;