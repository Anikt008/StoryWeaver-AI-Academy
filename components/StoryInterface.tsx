import React, { useState, useEffect, useRef } from 'react';
import { generateStorySegment, generateVisuals, generateSpeech } from '../services/geminiService';
import { StorySegment, Language, EmotionAnalysisResult, Emotion } from '../types';
import { Mic, Send, Volume2, Play, CheckCircle, XCircle, Sparkles, AlertTriangle, Video } from 'lucide-react';

interface StoryInterfaceProps {
  initialPrompt?: string;
  language: Language;
  onComplete: () => void;
  onUpdateStats: (correct: boolean) => void;
  emotionState: EmotionAnalysisResult;
}

const StoryInterface: React.FC<StoryInterfaceProps> = ({ 
  initialPrompt, 
  language, 
  onComplete,
  onUpdateStats,
  emotionState
}) => {
  const [history, setHistory] = useState<string[]>([]);
  const [currentSegment, setCurrentSegment] = useState<StorySegment | null>(null);
  const [inputText, setInputText] = useState(initialPrompt || "");
  const [loading, setLoading] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState<boolean | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  // Auto-trigger first generation if prompt is passed
  useEffect(() => {
    if (initialPrompt && history.length === 0 && !loading) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setQuizAnswered(null);
    setIsPlayingAudio(false);
    
    // Add user input to history for context
    const newHistory = [...history, `User: ${inputText}`];
    
    const segment = await generateStorySegment(
      inputText, 
      newHistory, 
      language, 
      emotionState.needsSimplification
    );

    if (segment) {
      setHistory([...newHistory, `AI: ${segment.text}`]);
      setCurrentSegment(segment);
      setInputText("");
      
      // Start Visual Generation in parallel
      setMediaLoading(true);
      generateVisuals(segment.mediaPrompt, segment.mediaType).then((url) => {
        setCurrentSegment(prev => prev ? { ...prev, mediaUrl: url } : null);
        setMediaLoading(false);
      });
      
      // Auto-play TTS if desired (or pre-fetch)
      playNarration(segment.text);
    }
    setLoading(false);
  };

  const playNarration = async (text: string) => {
    if (isPlayingAudio) {
        if(audioContext) audioContext.close();
        setIsPlayingAudio(false);
        return;
    }
    
    try {
        const audioData = await generateSpeech(text, language);
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

  const handleQuizOption = (isCorrect: boolean) => {
    setQuizAnswered(isCorrect);
    onUpdateStats(isCorrect);
  };

  // Agentic Workflow: Automatic adaptation notification
  const AdaptationBanner = () => {
    if (emotionState.needsSimplification) {
      return (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-3 mb-4 rounded shadow-sm flex items-center animate-fadeIn">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <p className="text-sm font-semibold">
            I noticed you might be a bit confused. I've simplified the story for you!
          </p>
        </div>
      );
    }
    if (emotionState.emotion === Emotion.HAPPY) {
        return (
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 mb-4 rounded shadow-sm flex items-center animate-fadeIn">
              <Sparkles className="w-5 h-5 mr-2" />
              <p className="text-sm font-semibold">
                You're doing great! Keep up the amazing energy!
              </p>
            </div>
          );
    }
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-32">
       <AdaptationBanner />

      {loading && !currentSegment && (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-indigo-600 font-fredoka text-xl animate-pulse">Weaving your story...</p>
            {emotionState.emotion !== Emotion.NEUTRAL && (
                <p className="text-sm text-gray-400">Adapting to your mood...</p>
            )}
        </div>
      )}

      {currentSegment && (
        <div className="space-y-6 animate-fadeIn">
            {/* Visuals */}
            <div className="relative w-full aspect-video bg-slate-200 rounded-3xl overflow-hidden shadow-lg border-4 border-white">
                {mediaLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                        <Sparkles className="w-10 h-10 text-indigo-400 animate-spin" />
                        <span className="ml-2 text-indigo-400 font-bold">Generating Magic...</span>
                    </div>
                ) : (
                    currentSegment.mediaUrl && (
                        currentSegment.mediaType === 'video' ? 
                        <video src={currentSegment.mediaUrl} autoPlay loop muted className="w-full h-full object-cover" /> :
                        <img src={currentSegment.mediaUrl} alt="Story visual" className="w-full h-full object-cover transition-transform hover:scale-105 duration-700" />
                    )
                )}
                
                {/* Media Type Badge */}
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur text-white text-xs px-2 py-1 rounded-full flex items-center">
                    {currentSegment.mediaType === 'video' ? <Video className="w-3 h-3 mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    {currentSegment.mediaType === 'video' ? 'Veo Generated' : 'Gemini 3 Pro'}
                </div>
            </div>

            {/* Story Text */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-indigo-50 relative">
                <button 
                    onClick={() => playNarration(currentSegment.text)}
                    className="absolute top-4 right-4 p-2 bg-indigo-100 hover:bg-indigo-200 rounded-full text-indigo-700 transition-colors"
                    title="Read Aloud"
                >
                    {isPlayingAudio ? <Volume2 className="w-5 h-5 animate-pulse" /> : <Play className="w-5 h-5" />}
                </button>
                <h3 className="text-2xl font-fredoka text-indigo-900 mb-4">Chapter {history.filter(h => h.startsWith('AI:')).length}</h3>
                <p className="text-lg leading-relaxed text-slate-700 whitespace-pre-line">
                    {currentSegment.text}
                </p>
            </div>

            {/* Interactive Quiz */}
            {currentSegment.quiz && (
                <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 p-1 rounded-3xl shadow-lg transform transition-all hover:scale-[1.01]">
                    <div className="bg-white p-6 rounded-[20px]">
                        <h4 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                            <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded mr-2 uppercase tracking-wide">Quick Quiz</span>
                            {currentSegment.quiz.question}
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                            {currentSegment.quiz.options.map((option, idx) => (
                                <button
                                    key={idx}
                                    disabled={quizAnswered !== null}
                                    onClick={() => handleQuizOption(option.isCorrect)}
                                    className={`
                                        w-full text-left p-4 rounded-xl border-2 transition-all font-semibold
                                        ${quizAnswered === null 
                                            ? 'border-slate-100 hover:border-indigo-400 hover:bg-indigo-50' 
                                            : option.isCorrect 
                                                ? 'border-green-500 bg-green-50' 
                                                : quizAnswered === option.isCorrect // if this was the selected wrong answer
                                                    ? 'border-slate-200 opacity-50' // actually we don't track which specific one was clicked in this simple state, assuming user picks correctly first or fails
                                                    : 'border-slate-200 opacity-50'
                                        }
                                    `}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>{option.text}</span>
                                        {quizAnswered !== null && option.isCorrect && <CheckCircle className="text-green-500 w-5 h-5" />}
                                        {quizAnswered !== null && !option.isCorrect && quizAnswered === false && <XCircle className="text-red-300 w-5 h-5" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                        {quizAnswered !== null && (
                            <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-xl text-sm animate-fadeIn">
                                <strong>Feedback:</strong> {currentSegment.quiz.feedback}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      )}

      {/* Input Area (Sticky Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-indigo-100">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
            <button className="p-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                <Mic className="w-6 h-6" />
            </button>
            <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="What happens next? (e.g., 'They find a glowing crystal...')"
                className="flex-1 bg-white border-2 border-slate-200 rounded-2xl px-6 py-3 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-lg shadow-sm"
                disabled={loading}
            />
            <button 
                onClick={handleGenerate}
                disabled={loading || !inputText.trim()}
                className={`
                    p-3 rounded-full text-white shadow-lg transition-all transform hover:scale-110
                    ${loading || !inputText.trim() ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}
                `}
            >
                {loading ? <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Send className="w-6 h-6" />}
            </button>
        </div>
      </div>
    </div>
  );
};

export default StoryInterface;