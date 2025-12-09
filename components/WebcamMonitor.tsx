import React, { useEffect, useRef } from 'react';
import { analyzeLearnerEmotion } from '../services/geminiService';
import { EmotionAnalysisResult, Emotion } from '../types';
import { Eye, EyeOff } from 'lucide-react';

interface WebcamMonitorProps {
  onEmotionDetected: (result: EmotionAnalysisResult) => void;
  isActive: boolean;
}

const WebcamMonitor: React.FC<WebcamMonitorProps> = ({ onEmotionDetected, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Camera access denied or unavailable");
      }
    };

    if (isActive) {
      startCamera();
    } else {
      // Stop tracks immediately if not active
      if (videoRef.current && videoRef.current.srcObject) {
        const currentStream = videoRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (stream) {
          stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
         const currentStream = videoRef.current.srcObject as MediaStream;
         currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
      }
      return;
    }

    // Check emotion every 10 seconds (as per requirements)
    intervalRef.current = window.setInterval(async () => {
      if (videoRef.current && canvasRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        // Ensure video is actually playing and has dimensions
        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
              context.drawImage(videoRef.current, 0, 0, 320, 240);
              try {
                const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
                const result = await analyzeLearnerEmotion(base64Data);
                onEmotionDetected(result);
              } catch(e) {
                console.error("Analysis failed", e);
              }
            }
        }
      }
    }, 10000); 

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [isActive, onEmotionDetected]);

  if (!isActive) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 group hidden md:block">
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} width="320" height="240" className="hidden" />
      
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-2 rounded-full shadow-lg border border-indigo-100 dark:border-slate-700 flex items-center gap-2 transition-all duration-300 hover:pr-4">
        <div className="relative">
          <div className="w-3 h-3 bg-green-500 rounded-full absolute top-0 right-0 animate-pulse"></div>
          <Eye className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <span className="text-xs font-semibold text-indigo-900 dark:text-slate-200 max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
          AI Monitoring Active
        </span>
      </div>
    </div>
  );
};

export default WebcamMonitor;