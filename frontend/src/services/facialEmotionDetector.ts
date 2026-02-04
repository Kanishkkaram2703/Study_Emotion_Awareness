/**
 * Facial Emotion Detection Service
 * Uses face-api.js for real-time facial emotion detection via webcam
 * Provides smoothed, confidence-scored emotion detection
 */

import * as faceapi from 'face-api.js';

export interface FacialEmotionData {
  emotion: string;
  confidence: number;
  expressions: {
    neutral: number;
    happy: number;
    sad: number;
    angry: number;
    fearful: number;
    disgusted: number;
    surprised: number;
  };
  timestamp: number;
}

export interface SmoothedEmotionState {
  emotion: string;
  confidence: number;
  history: FacialEmotionData[];
  lastUpdate: number;
}

class FacialEmotionDetector {
  private modelsLoaded = false;
  private emotionHistory: FacialEmotionData[] = [];
  private maxHistorySize = 10; // Keep last 10 detections for smoothing
  private detectionInterval: NodeJS.Timeout | null = null;
  private videoRef: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private isRunning = false;

  /**
   * Initialize and load face-api.js models
   * Must be called once before detection starts
   */
  async initialize(): Promise<void> {
    if (this.modelsLoaded) return;

    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

      await Promise.all([
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        (faceapi.nets as any).ssdMobilenetv1.loadFromUri(MODEL_URL),
      ]);

      this.modelsLoaded = true;
      console.log('✓ Face-API models loaded successfully');
    } catch (error) {
      console.error('✗ Failed to load face-api models:', error);
      throw error;
    }
  }

  /**
   * Request webcam access from user
   */
  async requestCameraAccess(): Promise<MediaStream> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      console.log('✓ Camera access granted');
      return this.stream;
    } catch (error) {
      console.error('✗ Camera access denied:', error);
      throw error;
    }
  }

  /**
   * Start continuous facial emotion detection
   */
  async startDetection(
    videoElement: HTMLVideoElement,
    onEmotionDetected?: (emotion: SmoothedEmotionState) => void
  ): Promise<void> {
    if (!this.modelsLoaded) {
      await this.initialize();
    }

    if (!this.stream) {
      await this.requestCameraAccess();
    }

    this.videoRef = videoElement;
    this.videoRef.srcObject = this.stream;

    this.isRunning = true;

    return new Promise((resolve) => {
      this.videoRef!.onloadedmetadata = async () => {
        this.videoRef!.play();

        // Start detection every 200ms
        this.detectionInterval = setInterval(async () => {
          if (!this.isRunning) return;

          try {
            const detections = await faceapi
              .detectSingleFace(this.videoRef!)
              .withFaceExpressions();

            if (detections && detections.expressions) {
              const facialEmotion = this.processFaceExpressions(
                detections.expressions
              );

              // Add to history for smoothing
              this.emotionHistory.push(facialEmotion);
              if (this.emotionHistory.length > this.maxHistorySize) {
                this.emotionHistory.shift();
              }

              // Get smoothed emotion state
              const smoothedState = this.getSmoothedEmotion();

              if (onEmotionDetected) {
                onEmotionDetected(smoothedState);
              }
            }
          } catch (error) {
            console.error('Facial detection error:', error);
          }
        }, 200); // 5 fps for real-time but not CPU-heavy

        resolve();
      };
    });
  }

  /**
   * Stop facial emotion detection and release resources
   */
  async stopDetection(): Promise<void> {
    this.isRunning = false;

    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    if (this.videoRef) {
      this.videoRef.pause();
      this.videoRef.srcObject = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.emotionHistory = [];
    console.log('✓ Facial emotion detection stopped');
  }

  /**
   * Process face-api expressions and map to simple emotion labels
   */
  private processFaceExpressions(expressions: {
    neutral: number;
    happy: number;
    sad: number;
    angry: number;
    fearful: number;
    disgusted: number;
    surprised: number;
  }): FacialEmotionData {
    // Map expressions to simple emotion labels
    const emotionMap: Record<string, string> = {
      neutral: 'neutral',
      happy: 'happy',
      sad: 'sad',
      stressed: 'angry',
      tired: 'sad',
      focused: 'neutral',
      anxious: 'fearful',
      surprised: 'surprised',
    };

    // Find dominant emotion
    let dominantEmotion = 'neutral';
    let maxConfidence = expressions.neutral;

    Object.entries(expressions).forEach(([emotion, confidence]) => {
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        dominantEmotion = emotion;
      }
    });

    // Map to Mentora emotion labels
    let mappedEmotion = 'neutral';
    if (dominantEmotion === 'happy') {
      mappedEmotion = 'happy';
    } else if (dominantEmotion === 'sad') {
      mappedEmotion = 'tired'; // Sadness often indicates fatigue
    } else if (dominantEmotion === 'angry') {
      mappedEmotion = 'stressed'; // Anger indicates stress
    } else if (dominantEmotion === 'fearful') {
      mappedEmotion = 'stressed'; // Fear indicates stress/anxiety
    } else if (dominantEmotion === 'surprised') {
      mappedEmotion = 'focused'; // Surprise can indicate engagement
    }

    return {
      emotion: mappedEmotion,
      confidence: maxConfidence,
      expressions,
      timestamp: Date.now(),
    };
  }

  /**
   * Get smoothed emotion state from history
   * Uses averaging to prevent flickering
   */
  private getSmoothedEmotion(): SmoothedEmotionState {
    if (this.emotionHistory.length === 0) {
      return {
        emotion: 'neutral',
        confidence: 0.5,
        history: [],
        lastUpdate: Date.now(),
      };
    }

    // Count emotion occurrences in history
    const emotionCounts: Record<string, number> = {};
    const emotionConfidences: Record<string, number> = {};

    this.emotionHistory.forEach((data) => {
      emotionCounts[data.emotion] = (emotionCounts[data.emotion] || 0) + 1;
      emotionConfidences[data.emotion] =
        (emotionConfidences[data.emotion] || 0) + data.confidence;
    });

    // Find most common emotion
    let dominantEmotion = 'neutral';
    let maxCount = 0;

    Object.entries(emotionCounts).forEach(([emotion, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion;
      }
    });

    // Average confidence for dominant emotion
    const avgConfidence = emotionConfidences[dominantEmotion] / emotionCounts[dominantEmotion];

    return {
      emotion: dominantEmotion,
      confidence: Math.min(avgConfidence, 1),
      history: this.emotionHistory,
      lastUpdate: Date.now(),
    };
  }

  /**
   * Get current smoothed emotion without waiting for callback
   */
  getCurrentEmotion(): SmoothedEmotionState {
    return this.getSmoothedEmotion();
  }

  /**
   * Clear emotion history (useful for context switching)
   */
  clearHistory(): void {
    this.emotionHistory = [];
  }

  /**
   * Check if detection is currently running
   */
  isDetectionRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const facialEmotionDetector = new FacialEmotionDetector();
