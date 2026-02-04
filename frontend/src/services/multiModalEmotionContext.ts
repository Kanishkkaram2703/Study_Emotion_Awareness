/**
 * Multi-Modal Emotion Context Service
 * Merges facial, voice, and text emotion into a unified emotion state
 * Provides emotion-aware responses and behavior rules
 */

import { SmoothedEmotionState } from './facialEmotionDetector';

export interface TextEmotionData {
  emotion: string;
  confidence: number;
  timestamp: number;
}

export interface VoiceEmotionData {
  emotion: string;
  confidence: number;
  tone: string;
  timestamp: number;
}

export interface MultiModalEmotionState {
  facialEmotion: SmoothedEmotionState | null;
  voiceEmotion: VoiceEmotionData | null;
  textEmotion: TextEmotionData | null;
  sessionDuration: number; // seconds
  mergedEmotion: string;
  confidence: number;
  lastUpdate: number;
  emotionHistory: Array<{
    emotion: string;
    source: 'facial' | 'voice' | 'text' | 'merged';
    timestamp: number;
  }>;
}

// Emotion weights for multi-modal merging
const EMOTION_WEIGHTS = {
  facial: 0.5, // 50% weight to facial emotion (most reliable)
  voice: 0.3,  // 30% weight to voice tone
  text: 0.2,   // 20% weight to text sentiment
};

// Emotion severity levels (for intensity-aware responses)
const EMOTION_SEVERITY: Record<string, number> = {
  happy: 0.8,    // Positive, high engagement
  focused: 0.7,  // Positive, high focus
  neutral: 0.5,  // Neutral baseline
  calm: 0.6,     // Positive, relaxed
  confused: 0.4, // Negative, needs clarity
  sad: 0.3,      // Negative, low mood
  tired: 0.2,    // Negative, low energy
  stressed: 0.1, // Negative, high anxiety
  anxious: 0.15, // Negative, anxiety
};

class MultiModalEmotionContext {
  private currentState: MultiModalEmotionState = {
    facialEmotion: null,
    voiceEmotion: null,
    textEmotion: null,
    sessionDuration: 0,
    mergedEmotion: 'neutral',
    confidence: 0.5,
    lastUpdate: Date.now(),
    emotionHistory: [],
  };

  private emotionHistoryLimit = 50;

  /**
   * Update facial emotion from webcam detection
   */
  updateFacialEmotion(facialEmotion: SmoothedEmotionState): void {
    this.currentState.facialEmotion = facialEmotion;
    this.currentState.lastUpdate = Date.now();
    this.recomputeMergedEmotion();
  }

  /**
   * Update voice emotion from speech analysis
   */
  updateVoiceEmotion(voiceEmotion: VoiceEmotionData): void {
    this.currentState.voiceEmotion = voiceEmotion;
    this.currentState.lastUpdate = Date.now();
    this.recomputeMergedEmotion();
  }

  /**
   * Update text emotion from sentiment analysis
   */
  updateTextEmotion(textEmotion: TextEmotionData): void {
    this.currentState.textEmotion = textEmotion;
    this.currentState.lastUpdate = Date.now();
    this.recomputeMergedEmotion();
  }

  /**
   * Update session duration (for fatigue detection)
   */
  updateSessionDuration(seconds: number): void {
    this.currentState.sessionDuration = seconds;
    this.recomputeMergedEmotion(); // Re-evaluate based on session length
  }

  /**
   * Merge emotions from all modalities
   */
  private recomputeMergedEmotion(): void {
    const emotions: Array<{ emotion: string; weight: number }> = [];

    // Collect emotions from available sources
    if (this.currentState.facialEmotion) {
      emotions.push({
        emotion: this.currentState.facialEmotion.emotion,
        weight: EMOTION_WEIGHTS.facial,
      });
    }

    if (this.currentState.voiceEmotion) {
      emotions.push({
        emotion: this.currentState.voiceEmotion.emotion,
        weight: EMOTION_WEIGHTS.voice,
      });
    }

    if (this.currentState.textEmotion) {
      emotions.push({
        emotion: this.currentState.textEmotion.emotion,
        weight: EMOTION_WEIGHTS.text,
      });
    }

    if (emotions.length === 0) {
      this.currentState.mergedEmotion = 'neutral';
      this.currentState.confidence = 0.5;
      return;
    }

    // Score each emotion based on weighted inputs
    const emotionScores: Record<string, number> = {};
    let totalWeight = 0;

    emotions.forEach(({ emotion, weight }) => {
      emotionScores[emotion] = (emotionScores[emotion] || 0) + weight;
      totalWeight += weight;
    });

    // Normalize scores
    Object.keys(emotionScores).forEach((emotion) => {
      emotionScores[emotion] /= totalWeight;
    });

    // Apply session duration heuristics
    emotionScores['tired'] = emotionScores['tired'] || 0;
    if (this.currentState.sessionDuration > 45 * 60) {
      // 45+ minutes → increase tiredness
      emotionScores['tired'] += 0.1;
    }
    if (this.currentState.sessionDuration > 90 * 60) {
      // 90+ minutes → strong tiredness signal
      emotionScores['tired'] += 0.15;
    }

    // Find dominant emotion
    let dominantEmotion = 'neutral';
    let maxScore = 0;

    Object.entries(emotionScores).forEach(([emotion, score]) => {
      if (score > maxScore) {
        maxScore = score;
        dominantEmotion = emotion;
      }
    });

    this.currentState.mergedEmotion = dominantEmotion;
    this.currentState.confidence = Math.min(maxScore, 1);

    // Log to history
    this.currentState.emotionHistory.push({
      emotion: dominantEmotion,
      source: 'merged',
      timestamp: Date.now(),
    });

    if (this.currentState.emotionHistory.length > this.emotionHistoryLimit) {
      this.currentState.emotionHistory.shift();
    }
  }

  /**
   * Get current merged emotion state
   */
  getCurrentState(): MultiModalEmotionState {
    return { ...this.currentState };
  }

  /**
   * Get emotion-aware response guidelines
   */
  getResponseGuidelines(): EmotionResponseGuidelines {
    const emotion = this.currentState.mergedEmotion;
    // Severity calculation for emotion response guidelines
    // const severity = EMOTION_SEVERITY[emotion] || 0.5;

    switch (emotion) {
      case 'happy':
      case 'focused':
        return {
          tone: 'energetic',
          verbosity: 'normal',
          detail: 'comprehensive',
          suggestions: ['Continue learning', 'Maintain momentum'],
          breakNeeded: false,
          encouragement: true,
          voiceSettings: {
            pitch: 'high',
            pace: 'fast',
            emotion: 'happy',
          },
        };

      case 'stressed':
      case 'anxious':
        return {
          tone: 'calm',
          verbosity: 'concise',
          detail: 'simplified',
          suggestions: [
            'Take a short break',
            'Try a breathing exercise',
            'Move to a different location',
          ],
          breakNeeded: true,
          encouragement: true,
          voiceSettings: {
            pitch: 'low',
            pace: 'slow',
            emotion: 'calm',
          },
        };

      case 'tired':
      case 'sad':
        return {
          tone: 'supportive',
          verbosity: 'minimal',
          detail: 'simplified',
          suggestions: [
            'Take a longer break',
            'Try a 10-minute power nap',
            'Go for a walk',
            'Stretch and move around',
          ],
          breakNeeded: true,
          encouragement: true,
          voiceSettings: {
            pitch: 'medium',
            pace: 'slow',
            emotion: 'calm',
          },
        };

      case 'confused':
        return {
          tone: 'patient',
          verbosity: 'detailed',
          detail: 'step-by-step',
          suggestions: [
            'Break down the problem',
            'Use analogies',
            'Start with fundamentals',
          ],
          breakNeeded: false,
          encouragement: true,
          voiceSettings: {
            pitch: 'medium',
            pace: 'medium',
            emotion: 'calm',
          },
        };

      default: // neutral, calm
        return {
          tone: 'professional',
          verbosity: 'normal',
          detail: 'comprehensive',
          suggestions: ['Keep learning', 'Maintain focus'],
          breakNeeded: false,
          encouragement: false,
          voiceSettings: {
            pitch: 'medium',
            pace: 'normal',
            emotion: 'neutral',
          },
        };
    }
  }

  /**
   * Get UI color scheme based on current emotion
   */
  getEmotionColorScheme(): EmotionColorScheme {
    const emotion = this.currentState.mergedEmotion;

    const schemes: Record<string, EmotionColorScheme> = {
      happy: {
        primary: '#FCD34D',
        secondary: '#FBBF24',
        background: '#FFFBEB',
        text: '#000000',
        accent: '#F59E0B',
        gradient: 'from-yellow-300 to-orange-400',
      },
      focused: {
        primary: '#10B981',
        secondary: '#059669',
        background: '#ECFDF5',
        text: '#000000',
        accent: '#34D399',
        gradient: 'from-green-400 to-emerald-600',
      },
      neutral: {
        primary: '#9CA3AF',
        secondary: '#6B7280',
        background: '#F9FAFB',
        text: '#000000',
        accent: '#D1D5DB',
        gradient: 'from-gray-400 to-gray-600',
      },
      calm: {
        primary: '#60A5FA',
        secondary: '#3B82F6',
        background: '#EFF6FF',
        text: '#000000',
        accent: '#93C5FD',
        gradient: 'from-blue-400 to-blue-600',
      },
      stressed: {
        primary: '#F87171',
        secondary: '#EF4444',
        background: '#FEF2F2',
        text: '#000000',
        accent: '#FCA5A5',
        gradient: 'from-red-400 to-red-600',
      },
      tired: {
        primary: '#A78BFA',
        secondary: '#8B5CF6',
        background: '#FAF5FF',
        text: '#000000',
        accent: '#D8B4FE',
        gradient: 'from-purple-400 to-purple-600',
      },
      sad: {
        primary: '#38BDF8',
        secondary: '#0EA5E9',
        background: '#F0F9FF',
        text: '#000000',
        accent: '#7DD3FC',
        gradient: 'from-sky-400 to-blue-600',
      },
      confused: {
        primary: '#F97316',
        secondary: '#FB923C',
        background: '#FFF7ED',
        text: '#000000',
        accent: '#FDBA74',
        gradient: 'from-orange-400 to-orange-600',
      },
      anxious: {
        primary: '#F472B6',
        secondary: '#EC4899',
        background: '#FDF2F8',
        text: '#000000',
        accent: '#F9A8D4',
        gradient: 'from-pink-400 to-red-500',
      },
    };

    return schemes[emotion] || schemes.neutral;
  }

  /**
   * Clear emotion history and reset state
   */
  reset(): void {
    this.currentState = {
      facialEmotion: null,
      voiceEmotion: null,
      textEmotion: null,
      sessionDuration: 0,
      mergedEmotion: 'neutral',
      confidence: 0.5,
      lastUpdate: Date.now(),
      emotionHistory: [],
    };
  }
}

export interface EmotionResponseGuidelines {
  tone: 'energetic' | 'calm' | 'supportive' | 'patient' | 'professional';
  verbosity: 'minimal' | 'concise' | 'normal' | 'detailed';
  detail: 'simplified' | 'step-by-step' | 'comprehensive';
  suggestions: string[];
  breakNeeded: boolean;
  encouragement: boolean;
  voiceSettings: {
    pitch: 'low' | 'medium' | 'high';
    pace: 'slow' | 'medium' | 'fast' | 'normal';
    emotion: string;
  };
}

export interface EmotionColorScheme {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
  gradient: string;
}

// Export singleton instance
export const multiModalEmotionContext = new MultiModalEmotionContext();
