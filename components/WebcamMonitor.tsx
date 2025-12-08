import React, { useEffect, useRef } from 'react';
import { analyzeLearnerEmotion } from '../services/geminiService';
import { EmotionAnalysisResult } from '../types';
import { Eye } from 'lucide-react';

interface WebcamMonitorProps {
  onEmotionDetected: (result: EmotionAnalysisResult) => void;
  isActive: boolean;
}

const WebcamMonitor: React.FC<WebcamMonitorProps> = ({ onEmotionDetected, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Fix: Use 'number' instead of 'NodeJS.Timeout' for browser environment compatibility
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
        console.error("Error accessing webcam:", err);
      }
    };

    if (isActive) {
      startCamera();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      return;
    }

    // Check emotion every 15 seconds to avoid overwhelming API and user
    // Fix: Use window.setInterval to ensure return type is number
    intervalRef.current = window.setInterval(async () => {
      if (videoRef.current && canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        if (context) {
          context.drawImage(videoRef.current, 0, 0, 320, 240);
          const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.7).split(',')[1];
          
          const result = await analyzeLearnerEmotion(base64Data);
          onEmotionDetected(result);
        }
      }
    }, 15000); 

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [isActive, onEmotionDetected]);

  if (!isActive) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 group">
      {/* Hidden processing elements */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" width="320" height="240" />
      <canvas ref={canvasRef} width="320" height="240" className="hidden" />

      {/* UI Indicator */}
      <div className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg border border-indigo-100 flex items-center gap-2 transition-all duration-300 hover:pr-4">
        <div className="relative">
          <div className="w-3 h-3 bg-green-500 rounded-full absolute top-0 right-0 animate-pulse"></div>
          <Eye className="w-6 h-6 text-indigo-600" />
        </div>
        <span className="text-xs font-semibold text-indigo-900 max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
          AI Tutor Watching
        </span>
      </div>
    </div>
  );
};

export default WebcamMonitor;