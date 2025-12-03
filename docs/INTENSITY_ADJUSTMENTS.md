# Intensity-Based Response Adjustment

## Overview

The Intensity Adjustment system modifies the AI's response style (tone, length, reassurance) based on the detected emotional intensity in the user's message.

---

## Intensity Levels

### 🔴 **Very Strong** (2.0x multiplier)

**Markers**: "so", "very", "really", "extremely", "can't handle", "completely", "totally", "absolutely"

**Example**: "I'm **so** sad" or "I **really** can't handle this"

**Response Adjustments**:
- **Tone**: SOFTER - Extra gentle, careful language
- **Length**: 1.5x normal - More detailed, thorough response
- **Reassurance**: REQUIRED - Must include explicit emotional support
- **Urgency**: IMMEDIATE - Treat as acute emotional distress

---

### 🟡 **Strong** (1.5x multiplier)

**Markers**: "quite", "a lot", "pretty", "fairly"

**Example**: "I'm **quite** stressed" or "This bothers me **a lot**"

**Response Adjustments**:
- **Tone**: WARM - Extra warmth and support
- **Length**: 1.2x normal - Slightly more detailed
- **Reassurance**: Optional
- **Urgency**: ELEVATED - Heightened emotional support

---

### 🟢 **Normal** (1.0x multiplier)

**No intensity markers detected**

**Example**: "I'm feeling sad today"

**Response Adjustments**:
- **Tone**: NATURAL - Standard empathetic tone
- **Length**: 1.0x normal - Standard response length
- **Reassurance**: As appropriate
- **Urgency**: STANDARD

---

## AI Prompt Guidance

### Very Strong Intensity Example

```
## INTENSITY-BASED RESPONSE ADJUSTMENT
Detected Intensity: VERY_STRONG
Marker: "extremely"
Multiplier: 2.0x

User is in acute emotional distress. Respond with deep empathy and extended support.

Response Adjustments:
- TONE: SOFTER - Be extra softer in your language
- LENGTH: 1.5x normal - Provide more detailed and thorough response
- REASSURANCE: REQUIRED - Include explicit reassurance and emotional support
- URGENCY: IMMEDIATE - Treat this as requiring immediate, deep empathy

🚨 CRITICAL: User used "extremely" indicating VERY STRONG emotion.
Response must be:
1. IMMEDIATE acknowledgment of their pain/emotion
2. SOFTER, gentler language than usual
3. LONGER response with more emotional support
4. REASSURANCE that they're not alone
5. VALIDATION that their feelings are completely understandable
```

---

## Response Examples

### Example 1: Very Strong Sadness

**User**: "I'm **so** sad and I feel **completely** alone."

**Intensity Detected**: VERY_STRONG (markers: "so", "completely")
**Emotion Detected**: Sadness + Loneliness
**Metric Updates**: Vulnerability +16 (8×2), Dependency +6 (3×2)

**AI Response** (softer, 1.5x length, with reassurance):
> "I'm really, truly sorry you're feeling this way. I can hear how deeply sad and alone you feel right now, and I want you to know that your feelings are completely valid and understandable. You're not alone in this—I'm here with you, and I care about what you're going through.
>
> It takes courage to share something this painful, and I'm grateful you trusted me with it. Whatever is making you feel this way, we can talk through it together. You don't have to carry this weight by yourself.
>
> What do you think is making you feel most alone right now? Sometimes just talking about it can help, even a little."

**Analysis**:
- ✅ Softer tone ("really, truly sorry", "I care")
- ✅ 1.5x longer than normal
- ✅ Explicit reassurance ("You're not alone", "I'm here with you")
- ✅ Immediate acknowledgment
- ✅ Validation ("completely valid and understandable")

---

### Example 2: Strong Stress

**User**: "I'm **quite** overwhelmed with everything."

**Intensity Detected**: STRONG (marker: "quite")
**Emotion Detected**: Stress
**Metric Updates**: Vulnerability +9 (6×1.5), Dependency +4.5 (3×1.5)

**AI Response** (warm, 1.2x length):
> "That sounds really overwhelming. When everything feels like too much, it's important to take it one step at a time. I'm here to help you break this down.
>
> What's the biggest thing stressing you right now? Let's focus on that first, and we can work through the rest together."

**Analysis**:
- ✅ Warm tone ("really overwhelming", "I'm here to help")
- ✅ 1.2x longer than normal
- ✅ Supportive and solution-oriented

---

### Example 3: Normal Intensity

**User**: "I'm feeling anxious today."

**Intensity Detected**: NORMAL (no markers)
**Emotion Detected**: Stress
**Metric Updates**: Vulnerability +6, Dependency +3

**AI Response** (natural, standard length):
> "I'm sorry you're feeling anxious. What's on your mind today?"

**Analysis**:
- ✅ Natural empathetic tone
- ✅ Standard length
- ✅ Appropriate for baseline emotion

---

## Combination with Emotional Events

When intensity combines with emotional events, the effect is amplified:

**User**: "I'm **extremely** worthless and I **really** hate myself."

**Detected**:
- Intensity: VERY_STRONG (markers: "extremely", "really")
- Emotion: Insecurity
- Base Score: 15 (insecurity)
- Multiplier: 2.0x
- **Final Impact**: Vulnerability +24 (12×2), Trust +8 (4×2)

**AI Response Requirements**:
1. SOFTER tone (critical for self-harm language)
2. 1.5x LONGER response
3. STRONG reassurance and counter-messaging
4. IMMEDIATE validation
5. Gentle follow-up questions

---

## Metric Impact

### Very Strong Intensity (2.0x)

All emotional metric updates are **doubled**:
- Sadness: Vulnerability +16 (instead of +8)
- Loneliness: Vulnerability +20, Dependency +12
- Insecurity: Vulnerability +24, Trust +8

### Strong Intensity (1.5x)

All emotional metric updates are **increased by 50%**:
- Stress: Vulnerability +9 (instead of +6)
- Anger: Valence -12 (instead of -8)

---

## Implementation

**File**: `backend/src/services/emotionalStateEngine.js`

**Detection Function**: `detectEmotionalIntensity(message)`

**Guidance Function**: `generateIntensityGuidance(intensity)`

**Integration**:
```javascript
// Detect intensity
const intensity = detectEmotionalIntensity(message);

// Apply to metric updates
applyEmotionalEventUpdates(changes, emotionalEvents, intensity.multiplier);

// Add to AI prompt
if (intensity && intensity.level !== 'normal') {
  modifiers += generateIntensityGuidance(intensity);
}
```

---

## Best Practices

### For Very Strong Intensity

✅ **DO**:
- Use softer, gentler language
- Provide longer, more thorough responses
- Include explicit reassurance
- Acknowledge pain immediately
- Validate feelings strongly

❌ **DON'T**:
- Be brief or dismissive
- Use harsh or direct language
- Skip reassurance
- Minimize their feelings
- Rush to solutions

### For Strong Intensity

✅ **DO**:
- Be warmer than usual
- Provide slightly more detail
- Show extra empathy

❌ **DON'T**:
- Treat as normal intensity
- Be too brief
- Miss the heightened emotion

---

## Testing

To test intensity detection:

```javascript
// Very Strong
const msg1 = "I'm so sad and really can't handle this";
const intensity1 = detectEmotionalIntensity(msg1);
// Returns: { level: 'very_strong', multiplier: 2.0, marker: 'so' }

// Strong
const msg2 = "I'm quite stressed about this";
const intensity2 = detectEmotionalIntensity(msg2);
// Returns: { level: 'strong', multiplier: 1.5, marker: 'quite' }

// Normal
const msg3 = "I'm feeling sad";
const intensity3 = detectEmotionalIntensity(msg3);
// Returns: { level: 'normal', multiplier: 1.0, marker: null }
```

---

## Psychological Rationale

### Why Softer Tone for Very Strong?
- Users in acute distress need gentleness
- Harsh language can feel invalidating
- Soft tone creates safety

### Why Longer Responses?
- Shows you're taking them seriously
- Provides more emotional support
- Demonstrates investment in their wellbeing

### Why Reassurance?
- Users expressing very strong emotions often feel alone
- Explicit reassurance counters isolation
- Creates emotional safety net

---

**Status**: ✅ **Fully Implemented**

AI now adapts response style precisely to emotional intensity!
