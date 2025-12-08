import React, { useState, useEffect } from 'react';
import { AppMode, Language, UserProgress, EmotionAnalysisResult, Emotion } from './types';
import StoryInterface from './components/StoryInterface';
import WebcamMonitor from './components/WebcamMonitor';
import Dashboard from './components/Dashboard';
import { Compass, LayoutDashboard, Globe, Sparkles, Moon, Sun, Wifi, WifiOff, Key } from 'lucide-react';
import { getOfflineStories } from './services/geminiService';

const INITIAL_PROGRESS: UserProgress = {
  badges: ['Space Explorer', 'Dino Expert', 'History Hero'],
  storiesCompleted: 15,
  quizzesPassed: 42,
  totalPoints: 1850,
  literacyScore: [65, 68, 72, 70, 75, 78, 82, 85, 88, 91],
  engagementScore: [70, 60, 80, 85, 90, 88, 92, 95, 96, 94]
};

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [progress, setProgress] = useState<UserProgress>(INITIAL_PROGRESS);
  const [storyPrompt, setStoryPrompt] = useState("");
  const [emotionState, setEmotionState] = useState<EmotionAnalysisResult>({ emotion: Emotion.NEUTRAL, confidence: 0, needsSimplification: false });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // API Key Check
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        setHasApiKey(true); // Dev fallback
      }
    };
    checkKey();

    // Offline & Theme Listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDarkMode(true);
    }

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleStartStory = (prompt: string) => {
    setStoryPrompt(prompt);
    setMode(AppMode.STORY);
  };

  const updateStats = (correct: boolean) => {
    const newPoints = correct ? 50 : 10;
    setProgress(prev => ({
      ...prev,
      quizzesPassed: correct ? prev.quizzesPassed + 1 : prev.quizzesPassed,
      totalPoints: prev.totalPoints + newPoints
    }));
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="bg-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <Key className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-fredoka text-indigo-900">StoryWeaver Academy</h1>
          <p className="text-slate-600">Please connect your Google API Key to unlock Gemini 3 Pro features.</p>
          <button onClick={handleSelectKey} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:scale-105 transition-transform">
            Connect API Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setMode(AppMode.HOME)}>
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-fredoka font-bold text-indigo-900 dark:text-white hidden md:block">StoryWeaver AI</span>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
             {isOffline && (
                 <div className="flex items-center gap-1 text-amber-600 bg-amber-100 px-3 py-1 rounded-full text-xs font-bold">
                     <WifiOff className="w-3 h-3" /> Offline Mode
                 </div>
             )}

             <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                 {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-500" />}
             </button>

             <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Globe className="w-4 h-4" />
                    <span className="text-sm font-medium hidden md:block">{language}</span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 hidden group-hover:block p-2">
                    {Object.values(Language).map(l => (
                        <button key={l} onClick={() => setLanguage(l)} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${language === l ? 'bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-300' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                            {l}
                        </button>
                    ))}
                </div>
             </div>

            <button onClick={() => setMode(mode === AppMode.DASHBOARD ? AppMode.HOME : AppMode.DASHBOARD)} className={`p-2 rounded-xl transition-colors ${mode === AppMode.DASHBOARD ? 'bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300' : 'text-slate-400'}`}>
              <LayoutDashboard className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {mode === AppMode.HOME && (
          <div className="max-w-5xl mx-auto px-6 py-12 animate-fadeIn">
            <div className="text-center mb-16 space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" /> Gemini 3 Pro Powered
                </div>
                <h1 className="text-5xl md:text-7xl font-fredoka leading-tight">
                    Learn through <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-fuchsia-500">Magic & Stories</span>
                </h1>
                <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                    Type or say any topic, and watch it turn into an interactive lesson with videos, quizzes, and adaptive AI tutoring.
                </p>
            </div>

            {/* Input Hero */}
            <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 p-3 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-2 transform transition hover:scale-[1.01] duration-300">
                <input 
                    type="text" 
                    placeholder="Imagine a story about..." 
                    className="flex-1 bg-transparent px-6 text-xl outline-none text-slate-700 dark:text-white placeholder:text-slate-300"
                    onChange={(e) => setStoryPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStartStory(storyPrompt)}
                />
                <button 
                    onClick={() => handleStartStory(storyPrompt)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-[1.5rem] font-bold text-lg flex items-center gap-2 shadow-lg"
                >
                    <Sparkles className="w-5 h-5" />
                    Go!
                </button>
            </div>

            {/* Offline Library */}
            {isOffline && (
                <div className="mt-12">
                    <h3 className="text-xl font-bold mb-4 opacity-70">Saved Stories (Offline)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getOfflineStories().map(s => (
                            <div key={s.id} onClick={() => { setStoryPrompt(s.title); setMode(AppMode.STORY); }} className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-500">
                                <h4 className="font-bold text-lg">{s.title}</h4>
                                <p className="text-sm opacity-60">{new Date(s.timestamp).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Quick Prompts */}
            {!isOffline && (
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { title: "Photosynthesis Adventure", desc: "Become a sunbeam inside a leaf!", color: "from-green-400 to-emerald-600" },
                        { title: "Mars Rover Rescue", desc: "Fix the rover before the storm hits.", color: "from-orange-400 to-red-600" },
                        { title: "Ancient Rome Mystery", desc: "Solve a puzzle in the Colosseum.", color: "from-blue-400 to-indigo-600" }
                    ].map((item, i) => (
                        <button key={i} onClick={() => handleStartStory(item.title)} className="group relative overflow-hidden rounded-3xl aspect-[4/3] text-left p-6 flex flex-col justify-end transition-all hover:shadow-xl">
                            <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-90 group-hover:opacity-100 transition-opacity`} />
                            <div className="relative z-10 text-white">
                                <h3 className="text-2xl font-fredoka font-bold mb-2">{item.title}</h3>
                                <p className="text-white/80 font-medium">{item.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
          </div>
        )}

        {mode === AppMode.STORY && (
          <StoryInterface 
            initialPrompt={storyPrompt} 
            language={language}
            onComplete={() => setMode(AppMode.DASHBOARD)}
            onUpdateStats={updateStats}
            emotionState={emotionState}
            isOffline={isOffline}
          />
        )}

        {mode === AppMode.DASHBOARD && (
          <Dashboard progress={progress} />
        )}
      </main>

      <WebcamMonitor 
        isActive={mode === AppMode.STORY && !isOffline} 
        onEmotionDetected={setEmotionState} 
      />
    </div>
  );
};

export default App;
