import React, { useState, useEffect, useRef } from 'react';
import { generateFullStory, generateVisuals, generateSpeech, simplifyContent, updateStorySceneMedia, VOICES } from '../services/geminiService';
import { FullStory, Language, EmotionAnalysisResult, Emotion, StoryScene } from '../types';
import { Mic, Send, Volume2, Play, CheckCircle, XCircle, Sparkles, AlertTriangle, ArrowRight, ArrowLeft, Download, Share2, Pause, Settings2, Check, RefreshCw, BookOpen } from 'lucide-react';

interface StoryInterfaceProps {
  initialPrompt?: string;
  language: Language;
  onComplete: () => void;
  onUpdateStats: (correct: boolean) => void;
  emotionState: EmotionAnalysisResult;
  isOffline: boolean;
}

const StoryInterface: React.FC<StoryInterfaceProps> = ({ 
  initialPrompt, 
  language, 
  onComplete,
  onUpdateStats,
  emotionState,
  isOffline
}) => {
  // State
  const [story, setStory] = useState<FullStory | null>(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState(initialPrompt || "");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [quizState, setQuizState] = useState<{ [key: number]: boolean | null }>({}); // index -> isCorrect
  const [simplifying, setSimplifying] = useState(false);
  const [mediaCache, setMediaCache] = useState<{ [key: string]: string }>({});
  const [selectedVoice, setSelectedVoice] = useState<string>('Puck');

  const isQuizMode = story && currentSceneIndex >= story.scenes.length;

  // Initial generation
  useEffect(() => {
    if (initialPrompt && !story && !loading && !error) {
      handleGenerate();
    }
  }, []);

  // Monitor emotion for simplification
  useEffect(() => {
    const handleSimplification = async () => {
        if (emotionState.needsSimplification && story && !isQuizMode && !simplifying) {
            setSimplifying(true);
            const scene = story.scenes[currentSceneIndex];
            // Don't simplify if already very short
            if (scene.text.length > 50) {
                const simplifiedText = await simplifyContent(scene.text, language);
                setStory(prev => {
                    if (!prev) return null;
                    const newScenes = [...prev.scenes];
                    newScenes[currentSceneIndex] = { ...newScenes[currentSceneIndex], text: simplifiedText };
                    return { ...prev, scenes: newScenes };
                });
            }
            setSimplifying(false);
        }
    };
    handleSimplification();
  }, [emotionState, currentSceneIndex, story, isQuizMode]);

  // Generate Media for current scene when it changes
  useEffect(() => {
    if (story && !isQuizMode) {
        const scene = story.scenes[currentSceneIndex];
        
        // Use cached media from story object if available (offline mode support)
        if (scene.mediaUrl && !mediaCache[scene.id]) {
            setMediaCache(prev => ({ ...prev, [scene.id]: scene.mediaUrl! }));
            return;
        }

        // Otherwise generate fresh media
        if (!mediaCache[scene.id] && !isOffline) {
            generateVisuals(scene.imagePrompt, scene.mediaType).then(url => {
                if (url) {
                    setMediaCache(prev => ({ ...prev, [scene.id]: url }));
                    // IMPORTANT: Persist the generated media to the offline story storage
                    updateStorySceneMedia(story.id, scene.id, url);
                }
            });
        }
    }
  }, [story, currentSceneIndex, isQuizMode, isOffline]);

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    setStory(null);
    setCurrentSceneIndex(0);
    setMediaCache({});
    setQuizState({});
    
    // Determine age based on complexity (mock)
    const age = 10; 

    const newStory = await generateFullStory(inputText, age, language);
    if (newStory) {
      setStory(newStory);
      setInputText("");
      
      // Pre-populate media cache with any existing mediaUrls (e.g. from offline load)
      const initialCache: {[key: string]: string} = {};
      newStory.scenes.forEach(s => {
          if(s.mediaUrl) initialCache[s.id] = s.mediaUrl;
      });
      setMediaCache(initialCache);

    } else {
      setError("Oops! Creating this story was a bit too tricky. Please try a different topic.");
    }
    setLoading(false);
  };

  const playNarration = async (text: string) => {
    if (isPlayingAudio) {
        audioContext?.close();
        setIsPlayingAudio(false);
        return;
    }
    
    if (isOffline) {
        // Fallback to browser TTS offline
        const u = new SpeechSynthesisUtterance(text);
        u.lang = language === Language.HINDI ? 'hi-IN' : (language === Language.SPANISH ? 'es-ES' : 'en-US');
        window.speechSynthesis.speak(u);
        setIsPlayingAudio(true);
        u.onend = () => setIsPlayingAudio(false);
        return;
    }

    try {
        const audioData = await generateSpeech(text, language, selectedVoice);
        if (audioData) {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            setAudioContext(ctx);
            const audioBuffer = await ctx.decodeAudioData(audioData);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.start(0);
            setIsPlayingAudio(true);
            source.onended = () => setIsPlayingAudio(false);
        }
    } catch (e) {
        console.error("Audio playback failed", e);
    }
  };

  const playQuizSound = (isCorrect: boolean) => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (isCorrect) {
        // Happy major chord arpeggio
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        oscillator.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.5);
    } else {
        // Gentle buzz
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.3);
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = language === Language.HINDI ? 'hi-IN' : (language === Language.SPANISH ? 'es-ES' : 'en-US');
      recognition.start();
      setIsListening(true);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      alert("Voice input not supported in this browser.");
    }
  };

  const handleShare = () => {
    window.print();
  };

  const handleQuizAnswer = (qIndex: number, isCorrect: boolean) => {
    setQuizState(prev => ({ ...prev, [qIndex]: isCorrect }));
    playQuizSound(isCorrect);
    
    if (isCorrect) {
        if (window.confetti) {
            window.confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }
    onUpdateStats(isCorrect);
  };

  // Rendering
  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 text-center animate-pulse">
            <div className="relative">
                <Sparkles className="w-20 h-20 text-indigo-400 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center font-bold text-white">AI</div>
            </div>
            <h2 className="text-3xl font-fredoka text-indigo-900 dark:text-indigo-300">Weaving your adventure...</h2>
            <p className="text-slate-500 dark:text-slate-400">Designing characters • Writing plot • Generating quizzes</p>
        </div>
    );
  }

  if (!story) {
    return (
        <div className="max-w-xl mx-auto mt-20 p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-xl text-center">
             <h2 className="text-2xl font-bold mb-4 dark:text-white">Start Your Journey</h2>
             
             {error && (
                 <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center justify-center gap-2">
                     <AlertTriangle className="w-5 h-5" />
                     {error}
                 </div>
             )}

             <div className="flex gap-2">
                 <input 
                    className="flex-1 p-4 rounded-xl border-2 border-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="E.g., A magical tiger in Mumbai..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                 />
                 <button 
                    onClick={startVoiceInput} 
                    className={`p-4 rounded-xl transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-400' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200'}`}
                 >
                    <Mic className={`w-6 h-6 ${isListening ? 'text-red-600' : 'text-indigo-600'}`} />
                 </button>
             </div>
             {isListening && <p className="text-sm text-slate-500 mt-2 animate-bounce">Listening...</p>}
             
             <button onClick={handleGenerate} className="mt-4 w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-transform hover:scale-[1.02] flex items-center justify-center gap-2">
                 <Sparkles className="w-5 h-5" />
                 Generate Story
             </button>
        </div>
    );
  }

  // Quiz Mode
  if (isQuizMode) {
      return (
          <div className="max-w-3xl mx-auto py-8 px-4 animate-fadeIn pb-32">
              <h2 className="text-3xl font-fredoka text-center mb-8 text-indigo-900 dark:text-white">Adventure Quiz!</h2>
              
              {/* Exam Notes / Key Takeaways */}
              {story.notes && story.notes.length > 0 && (
                <div className="mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <BookOpen className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                        <h3 className="text-xl font-bold text-amber-900 dark:text-amber-100">Key Takeaways</h3>
                    </div>
                    <ul className="space-y-2">
                        {story.notes.map((note, i) => (
                            <li key={i} className="flex gap-2 text-slate-700 dark:text-slate-200">
                                <span className="text-amber-500 font-bold">•</span>
                                {note}
                            </li>
                        ))}
                    </ul>
                </div>
              )}

              <div className="space-y-6">
                  {story.quiz.map((q, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-indigo-50 dark:border-slate-700">
                          <h3 className="text-lg font-bold mb-4 dark:text-slate-200">{idx + 1}. {q.question}</h3>
                          <div className="grid gap-3">
                              {q.options.map((opt, oIdx) => (
                                  <button 
                                    key={oIdx}
                                    disabled={quizState[idx] !== undefined}
                                    onClick={() => handleQuizAnswer(idx, opt.isCorrect)}
                                    className={`p-3 rounded-xl text-left border-2 transition-all
                                        ${quizState[idx] === undefined 
                                            ? 'border-slate-100 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-400'
                                            : opt.isCorrect 
                                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                                                : 'border-red-200 opacity-60'
                                        }
                                        dark:text-slate-200
                                    `}
                                  >
                                      {opt.text}
                                      {quizState[idx] !== undefined && opt.isCorrect && <CheckCircle className="inline ml-2 text-green-500 w-4 h-4"/>}
                                  </button>
                              ))}
                          </div>
                          {quizState[idx] !== undefined && (
                              <div className="mt-4 text-sm text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg">
                                  {q.feedback}
                              </div>
                          )}
                      </div>
                  ))}
              </div>
              <div className="mt-8 flex justify-center gap-4">
                  <button onClick={() => { setStory(null); onComplete(); }} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold shadow-lg">
                      Finish & Collect Rewards
                  </button>
              </div>
          </div>
      );
  }

  const currentScene = story.scenes[currentSceneIndex];

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 pb-32">
        {/* Header Controls */}
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl md:text-2xl font-bold font-fredoka text-indigo-900 dark:text-white truncate max-w-md">
                {story.title}
            </h1>
            <div className="flex gap-2">
                <button onClick={handleShare} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" title="Print/Save PDF">
                    <Download className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
                <div className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-sm font-bold">
                    Page {currentSceneIndex + 1} / {story.scenes.length}
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Visuals */}
            <div className="order-2 lg:order-1 relative group">
                <div className="aspect-[16/9] bg-slate-200 dark:bg-slate-700 rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-600">
                    {mediaCache[currentScene.id] ? (
                         currentScene.mediaType === 'video' ? 
                         <video src={mediaCache[currentScene.id]} autoPlay loop muted className="w-full h-full object-cover" /> :
                         <img src={mediaCache[currentScene.id]} alt="Scene" className="w-full h-full object-cover transition-transform duration-[20s] hover:scale-110" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            {isOffline ? (
                                <span className="text-sm">Image unavailable offline</span>
                            ) : (
                                <>
                                    <Sparkles className="w-10 h-10 animate-spin mb-2" />
                                    <span>Creating visuals...</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
                {/* Emotion Badge */}
                {emotionState.emotion !== Emotion.NEUTRAL && !isOffline && (
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                        {emotionState.emotion === Emotion.CONFUSED ? '🤔 Thinking...' : (emotionState.emotion === Emotion.HAPPY ? '😄 Excited!' : '😐 Focused')}
                    </div>
                )}
            </div>

            {/* Text & Interaction */}
            <div className="order-1 lg:order-2 space-y-6">
                <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 relative">
                     <div className="absolute top-6 right-6 flex items-center gap-2">
                        {/* Voice Selector */}
                        <div className="relative group">
                            <button className="p-2 bg-indigo-50 dark:bg-slate-700 rounded-full text-indigo-600 hover:bg-indigo-100 transition-colors">
                                <Settings2 className="w-5 h-5" />
                            </button>
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 hidden group-hover:block p-2 z-10">
                                <p className="text-xs font-bold text-slate-500 mb-2 px-2">Narrator Voice</p>
                                {VOICES.map(v => (
                                    <button 
                                        key={v.id} 
                                        onClick={() => setSelectedVoice(v.id)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${selectedVoice === v.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300' : 'hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300'}`}
                                    >
                                        {v.name}
                                        {selectedVoice === v.id && <Check className="w-3 h-3" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={() => playNarration(currentScene.text)}
                            className="p-3 bg-indigo-50 dark:bg-slate-700 rounded-full text-indigo-600 hover:bg-indigo-100 transition-colors"
                        >
                            {isPlayingAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>
                    </div>
                    
                    {simplifying && (
                        <div className="mb-4 flex items-center text-amber-600 text-sm font-bold animate-pulse">
                            <Sparkles className="w-4 h-4 mr-2" /> Adapting story level...
                        </div>
                    )}

                    <p className="text-lg md:text-xl leading-relaxed text-slate-700 dark:text-slate-300 font-medium pt-8">
                        {currentScene.text}
                    </p>
                </div>

                {/* Navigation */}
                <div className="flex gap-4 pt-4">
                    <button 
                        onClick={() => setCurrentSceneIndex(Math.max(0, currentSceneIndex - 1))}
                        disabled={currentSceneIndex === 0}
                        className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold disabled:opacity-50 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-5 h-5" /> Previous
                    </button>
                    <button 
                        onClick={() => setCurrentSceneIndex(currentSceneIndex + 1)}
                        className="flex-[2] py-4 rounded-2xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    >
                        {currentSceneIndex === story.scenes.length - 1 ? 'Take Quiz' : 'Next Scene'}
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default StoryInterface;