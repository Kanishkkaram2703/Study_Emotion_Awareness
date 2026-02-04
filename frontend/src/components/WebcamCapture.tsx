import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { facialEmotionDetector, SmoothedEmotionState } from '../services/facialEmotionDetector';

interface WebcamCaptureProps {
  onEmotionDetected?: (emotion: SmoothedEmotionState) => void;
  onPermissionDenied?: () => void;
  autoStart?: boolean;
  showEmotionLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const emotionEmojis: Record<string, string> = {
  happy: '😊',
  neutral: '😐',
  sad: '😢',
  stressed: '😣',
  tired: '😴',
  focused: '🎯',
  anxious: '😰',
  surprised: '😲',
};

const emotionColors: Record<string, string> = {
  happy: 'from-yellow-400 to-orange-400',
  neutral: 'from-gray-300 to-gray-400',
  sad: 'from-blue-400 to-blue-600',
  stressed: 'from-red-400 to-red-600',
  tired: 'from-purple-400 to-purple-600',
  focused: 'from-green-400 to-green-600',
  anxious: 'from-orange-400 to-red-500',
  surprised: 'from-pink-400 to-purple-400',
};

/**
 * WebcamCapture Component
 * Displays live webcam feed and performs real-time facial emotion detection
 */
export const WebcamCapture: React.FC<WebcamCaptureProps> = ({
  onEmotionDetected,
  onPermissionDenied,
  autoStart = true,
  showEmotionLabel = true,
  size = 'medium',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<SmoothedEmotionState>({
    emotion: 'neutral',
    confidence: 0,
    history: [],
    lastUpdate: Date.now(),
  });
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Size classes
  const sizeClasses = {
    small: 'w-32 h-32',
    medium: 'w-64 h-48',
    large: 'w-full max-w-md h-96',
  };

  // Initialize facial detection on mount
  useEffect(() => {
    if (autoStart) {
      startDetection();
    }

    return () => {
      if (isRunning) {
        stopDetection();
      }
    };
  }, []);

  // Handle emotion updates
  useEffect(() => {
    if (onEmotionDetected && isRunning) {
      const emotionUpdateInterval = setInterval(() => {
        const currentState = facialEmotionDetector.getCurrentEmotion();
        setCurrentEmotion(currentState);
        onEmotionDetected(currentState);
      }, 500);

      return () => clearInterval(emotionUpdateInterval);
    }
  }, [isRunning, onEmotionDetected]);

  const startDetection = async () => {
    setIsInitializing(true);
    setError(null);

    try {
      await facialEmotionDetector.initialize();

      if (videoRef.current) {
        await facialEmotionDetector.startDetection(
          videoRef.current,
          (emotion) => {
            setCurrentEmotion(emotion);
            onEmotionDetected?.(emotion);
          }
        );
        setIsRunning(true);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to access camera';
      setError(errorMessage);
      onPermissionDenied?.();
      console.error('Webcam error:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  const stopDetection = async () => {
    await facialEmotionDetector.stopDetection();
    setIsRunning(false);
    setCurrentEmotion({
      emotion: 'neutral',
      confidence: 0,
      history: [],
      lastUpdate: Date.now(),
    });
  };

  const toggleDetection = async () => {
    if (isRunning) {
      await stopDetection();
    } else {
      await startDetection();
    }
  };

  const emotionColor = emotionColors[currentEmotion.emotion] || emotionColors.neutral;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Video Container */}
      <div className={`relative rounded-lg overflow-hidden ${sizeClasses[size]} bg-black shadow-lg`}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // Mirror the video for natural feel
        />

        {/* Emotion Overlay */}
        {showEmotionLabel && isRunning && (
          <div
            className={`absolute top-4 right-4 bg-gradient-to-r ${emotionColor} text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg`}
          >
            <span className="text-2xl">
              {emotionEmojis[currentEmotion.emotion] || '😐'}
            </span>
            <div className="flex flex-col">
              <span className="font-semibold capitalize">
                {currentEmotion.emotion}
              </span>
              <span className="text-xs opacity-90">
                {Math.round(currentEmotion.confidence * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isInitializing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin mb-3">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <p className="text-white text-sm">Initializing facial detection...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isInitializing && (
          <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center p-4">
            <div className="text-center">
              <CameraOff className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-white text-sm font-semibold">Camera Access Denied</p>
              <p className="text-red-200 text-xs mt-1">Please enable camera permissions</p>
            </div>
          </div>
        )}

        {/* Offline State */}
        {!isRunning && !isInitializing && !error && (
          <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
            <CameraOff className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Control Button */}
      <button
        onClick={toggleDetection}
        disabled={isInitializing || !!error}
        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${
          isRunning
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {isRunning ? (
          <>
            <CameraOff className="w-4 h-4" />
            Stop Detection
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" />
            Start Detection
          </>
        )}
      </button>

      {/* Emotion Stats */}
      {isRunning && currentEmotion.history.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          <p>Real-time emotion detected from {currentEmotion.history.length} frames</p>
          <p className="text-xs opacity-75">
            Current confidence: {Math.round(currentEmotion.confidence * 100)}%
          </p>
        </div>
      )}

      {/* Info Message */}
      {!isRunning && !error && (
        <p className="text-xs text-gray-500 text-center max-w-xs">
          Enable camera to start emotion detection. Your face will be analyzed in real-time
          to personalize your learning experience.
        </p>
      )}
    </div>
  );
};

export default WebcamCapture;
