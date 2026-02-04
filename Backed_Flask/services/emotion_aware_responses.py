"""
Emotion-Aware Response Service
Adapts Gemini responses based on detected emotional state
Implements personality rules for different emotions
"""

import google.generativeai as genai
from dotenv import load_dotenv
import os
import json

load_dotenv()
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

if not GEMINI_API_KEY:
    raise EnvironmentError("GEMINI_API_KEY is missing.")

genai.configure(api_key=GEMINI_API_KEY)

# Emotion-aware response templates and guidelines
EMOTION_RESPONSE_PROFILES = {
    "happy": {
        "tone": "energetic and enthusiastic",
        "verbosity": "normal to detailed",
        "style": "Use exclamation marks, encouraging language, celebrate progress",
        "length": "normal",
        "examples": ["That's awesome!", "You're doing great!", "Keep this momentum!"],
        "break_suggestion": False,
        "emoji_frequency": "high"
    },
    "focused": {
        "tone": "clear and structured",
        "verbosity": "comprehensive",
        "style": "Use step-by-step explanations, numbered lists, logical flow",
        "length": "comprehensive",
        "examples": ["Let's break this down.", "Here's the structured approach."],
        "break_suggestion": False,
        "emoji_frequency": "low"
    },
    "neutral": {
        "tone": "professional and balanced",
        "verbosity": "normal",
        "style": "Standard academic explanation with good clarity",
        "length": "normal",
        "examples": ["Here's what you need to know.", "Let me explain this concept."],
        "break_suggestion": False,
        "emoji_frequency": "medium"
    },
    "calm": {
        "tone": "soothing and supportive",
        "verbosity": "normal",
        "style": "Gentle, reassuring language with positive reinforcement",
        "length": "normal",
        "examples": ["Take your time.", "You've got this.", "Let's approach this calmly."],
        "break_suggestion": False,
        "emoji_frequency": "medium"
    },
    "stressed": {
        "tone": "calm and reassuring",
        "verbosity": "concise",
        "style": "SHORT sentences. Validate feelings. Offer breathing tips before deep explanation.",
        "length": "brief",
        "examples": ["I understand. Let's take this slow.", "Breathe. You're doing fine."],
        "break_suggestion": True,
        "emoji_frequency": "low",
        "suggestion": "Consider a 2-minute breathing exercise before we continue."
    },
    "tired": {
        "tone": "supportive and energizing",
        "verbosity": "minimal",
        "style": "VERY short, simple language. Use analogies instead of complex explanations.",
        "length": "brief",
        "examples": ["Let's keep it simple.", "One thing at a time.", "You're doing well!"],
        "break_suggestion": True,
        "emoji_frequency": "medium",
        "suggestion": "Take a 5-10 minute break. Stretch, get water, or take a short walk."
    },
    "sad": {
        "tone": "compassionate and encouraging",
        "verbosity": "minimal",
        "style": "Acknowledge emotions. Be extra supportive. Celebrate small wins.",
        "length": "brief",
        "examples": ["That's okay.", "You're stronger than you think.", "One step at a time."],
        "break_suggestion": True,
        "emoji_frequency": "medium",
        "suggestion": "How about a short break to refresh? You deserve it."
    },
    "confused": {
        "tone": "patient and teaching-focused",
        "verbosity": "detailed with step-by-step breakdown",
        "style": "Use analogies, simpler words, examples, step-by-step. Ask clarifying questions.",
        "length": "detailed",
        "examples": ["Let me explain differently.", "Think of it like...", "Does this make sense?"],
        "break_suggestion": False,
        "emoji_frequency": "high"
    },
    "anxious": {
        "tone": "calm and grounding",
        "verbosity": "concise",
        "style": "Ground the student. Start with simple breathing. Reassure them.",
        "length": "brief",
        "examples": ["You're safe.", "Let's focus on one thing.", "I'm here to help."],
        "break_suggestion": True,
        "emoji_frequency": "low",
        "suggestion": "Try the 5-4-3-2-1 grounding technique: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste."
    }
}


def adapt_response_for_emotion(text, emotion="neutral", difficulty="Beginner"):
    """
    Adapt text response based on detected emotion
    Makes responses more emotionally intelligent
    
    Args:
        text: The original response text
        emotion: Detected emotion (happy, focused, neutral, calm, stressed, tired, sad, confused, anxious)
        difficulty: Learning difficulty level
    
    Returns:
        dict with adapted response and metadata
    """
    
    if emotion not in EMOTION_RESPONSE_PROFILES:
        emotion = "neutral"
    
    profile = EMOTION_RESPONSE_PROFILES[emotion]
    
    # Create adaptation prompt
    adaptation_prompt = f"""
You are adapting an educational response for a student who is currently feeling {emotion.upper()}.

Original response:
"{text}"

Emotion Profile for "{emotion}":
- Tone: {profile['tone']}
- Verbosity: {profile['verbosity']}
- Style guidelines: {profile['style']}
- Response length: {profile['length']}

Please rewrite the response following these guidelines:
1. Match the tone and style described above
2. Keep the core educational content accurate
3. Adjust verbosity and detail level as indicated
4. Use the suggested style elements
5. {f'Keep the response VERY brief and simple' if profile['verbosity'] in ['minimal', 'concise'] else 'Provide comprehensive explanation'}
6. {'Use encouraging language and celebrate progress' if 'happy' in emotion or 'focused' in emotion else ''}
7. {'Be extra supportive and compassionate' if emotion in ['sad', 'stressed', 'tired', 'anxious'] else ''}

Rewrite the response now, keeping it emotionally appropriate for a {emotion} student:
"""
    
    try:
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        response = model.generate_content(adaptation_prompt)
        adapted_text = response.text
    except Exception as e:
        print(f"Error adapting response: {e}")
        adapted_text = text
    
    return {
        "original": text,
        "adapted": adapted_text,
        "emotion": emotion,
        "profile": profile,
        "break_suggested": profile.get("break_suggestion", False),
        "break_suggestion_text": profile.get("suggestion", ""),
        "emoji_frequency": profile.get("emoji_frequency", "medium")
    }


def generate_emotion_aware_explanation(topic, emotion="neutral", context=""):
    """
    Generate a fresh explanation tailored to emotional state
    More efficient than adapting existing response
    
    Args:
        topic: Topic or question to explain
        emotion: Current emotional state
        context: Additional context (e.g., what student knows)
    
    Returns:
        dict with explanation and recommendations
    """
    
    if emotion not in EMOTION_RESPONSE_PROFILES:
        emotion = "neutral"
    
    profile = EMOTION_RESPONSE_PROFILES[emotion]
    
    generation_prompt = f"""
Generate an explanation for a student who is currently feeling {emotion.upper()}.

Topic/Question: {topic}
{f'Context: {context}' if context else ''}

Emotion-Aware Guidelines:
- Tone: {profile['tone']}
- Response length: {profile['length']}
- Style: {profile['style']}
- Verbosity: {profile['verbosity']}

Generate an explanation NOW that:
1. Is emotionally appropriate for a {emotion} student
2. Is accurate and educationally sound
3. Follows the tone and style guidelines above
4. Uses appropriate length and detail
5. {'Keeps sentences SHORT and simple' if profile['verbosity'] == 'minimal' else ''}
6. {'Uses encouraging and celebratory language' if emotion in ['happy', 'focused'] else ''}
7. {'Includes reassurance and support' if emotion in ['stressed', 'tired', 'sad', 'anxious'] else ''}

Start the explanation immediately:
"""
    
    try:
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        response = model.generate_content(generation_prompt)
        explanation = response.text
    except Exception as e:
        print(f"Error generating emotion-aware explanation: {e}")
        explanation = f"I'm having trouble explaining this right now. Let me help you differently. Can you tell me what part is confusing?"
    
    return {
        "explanation": explanation,
        "emotion": emotion,
        "profile_used": profile,
        "break_suggested": profile.get("break_suggestion", False),
        "break_suggestion_text": profile.get("suggestion", ""),
        "recommendation": get_emotion_specific_recommendation(emotion)
    }


def generate_emotion_aware_summary(text, emotion="neutral"):
    """
    Generate summary adapted to emotional state
    Stressed students get shorter summaries, happy students get more detail
    
    Args:
        text: Text to summarize
        emotion: Current emotional state
    
    Returns:
        dict with summary and emotional context
    """
    
    if emotion not in EMOTION_RESPONSE_PROFILES:
        emotion = "neutral"
    
    profile = EMOTION_RESPONSE_PROFILES[emotion]
    
    # Adjust summary length based on emotion
    length_guidance = {
        "happy": "comprehensive (3-4 paragraphs)",
        "focused": "comprehensive (3-4 paragraphs)",
        "calm": "normal (2-3 paragraphs)",
        "neutral": "normal (2-3 paragraphs)",
        "confused": "detailed with step-by-step (3-4 paragraphs)",
        "stressed": "very brief (1 paragraph, bullet points)",
        "tired": "very brief (1 paragraph, bullet points)",
        "sad": "brief (1-2 paragraphs)",
        "anxious": "brief (1 paragraph, key points only)"
    }
    
    summary_prompt = f"""
Create a summary of the following text. The student is currently feeling {emotion.upper()}.

Summary length: {length_guidance.get(emotion, 'normal')}
Tone: {profile['tone']}
Style: {profile['style']}

Text to summarize:
{text}

Create the summary now:
"""
    
    try:
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        response = model.generate_content(summary_prompt)
        summary = response.text
    except Exception as e:
        print(f"Error generating emotion-aware summary: {e}")
        summary = "I'm unable to generate a summary right now. Would you like me to help you in a different way?"
    
    return {
        "summary": summary,
        "emotion": emotion,
        "length_type": length_guidance.get(emotion, "normal"),
        "break_suggested": profile.get("break_suggestion", False),
        "original_length": len(text.split()),
        "summary_length": len(summary.split())
    }


def get_emotion_specific_recommendation(emotion):
    """
    Get specific recommendation based on emotional state
    """
    recommendations = {
        "happy": "You're in a great mood! This is a perfect time to tackle challenging concepts. Keep going!",
        "focused": "You're in deep focus. This is ideal for learning complex topics. Make the most of it!",
        "calm": "You're calm and steady. Great for consistent, steady learning progress.",
        "neutral": "You're in neutral state. Good for balanced learning. Maintain your pace.",
        "confused": "You're confused, which is normal when learning! Let's clarify step by step.",
        "stressed": "You're stressed. Remember: you can do this. Take short breaks and breathe. One step at a time.",
        "tired": "You're tired. It's okay to slow down. Short bursts of learning with breaks help more than pushing through.",
        "sad": "I sense you're feeling down. Learning can help, but be gentle with yourself. Progress is progress.",
        "anxious": "You're anxious. That's okay. Let's take this slowly and focus on what you can control."
    }
    
    return recommendations.get(emotion, "You're learning. That's what matters. Keep going!")


def format_response_with_emotion_context(response_text, emotion, include_break_suggestion=True):
    """
    Format response with emotion-aware context and suggestions
    
    Args:
        response_text: The main response
        emotion: Detected emotion
        include_break_suggestion: Whether to include break suggestions
    
    Returns:
        Formatted response with context
    """
    
    if emotion not in EMOTION_RESPONSE_PROFILES:
        emotion = "neutral"
    
    profile = EMOTION_RESPONSE_PROFILES[emotion]
    
    formatted = {
        "response": response_text,
        "emotion_detected": emotion,
        "tone": profile['tone'],
        "emotion_aware": True
    }
    
    # Add break suggestion if needed and requested
    if include_break_suggestion and profile.get("break_suggestion"):
        formatted["break_suggestion"] = profile.get("suggestion", "")
        formatted["break_recommended"] = True
    else:
        formatted["break_recommended"] = False
    
    # Add recommendation
    formatted["recommendation"] = get_emotion_specific_recommendation(emotion)
    
    # Add encouragement for struggling emotions
    if emotion in ["stressed", "tired", "sad", "anxious"]:
        formatted["encouragement"] = True
        formatted["support_message"] = f"Remember: learning is a journey, not a destination. You're doing great! 💪"
    
    return formatted
