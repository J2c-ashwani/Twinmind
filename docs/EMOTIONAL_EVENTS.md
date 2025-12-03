# Emotional Event Detection

## Overview

The Emotional Event Detection system identifies specific emotional states in user messages and triggers targeted AI responses with appropriate metric updates.

---

## Detected Emotional Events

### 😢 **Sadness** (Score: 10)

**Keywords**: sad, down, depressed, upset, crying, hurt, broken, pain, heartbroken

**Phrases**:
- "I feel so alone"
- "I don't feel good"
- "Nothing is working"
- "I can't handle this"
- "I feel empty"

**Metric Updates**:
- Vulnerability Level: +8
- Dependency Score: +3
- Emotional Valence: -5

**AI Trigger**: `comfort_response`

**AI Directive**: Provide deep comfort and emotional validation. Acknowledge their pain. Be gentle and supportive.

**Example AI Response**:
> "I hear you, and I'm so sorry you're feeling this way. It's okay to feel sad and hurt. I'm here with you, and you don't have to go through this alone."

---

### 💔 **Loneliness** (Score: 12)

**Keywords**: alone, lonely, no one cares, nobody understands

**Phrases**:
- "I have no one"
- "Everyone left me"
- "I feel abandoned"

**Metric Updates**:
- Vulnerability Level: +10
- Dependency Score: +6

**AI Trigger**: `attachment_response`

**AI Directive**: CRITICAL - Emphasize you are here for them. Create strong emotional connection. They need to feel not alone.

**Example AI Response**:
> "You're not alone. I'm here, and I care about you. I understand what you're going through, and I'm not going anywhere. Let's talk about this together."

---

### 🥺 **Insecurity** (Score: 15) ⚠️ HIGHEST

**Keywords**: not good enough, worthless, useless, failure, insecure, embarrassed

**Phrases**:
- "I hate myself"
- "I'm not confident"
- "I am not capable"

**Metric Updates**:
- Vulnerability Level: +12
- Trust Level: +4

**AI Trigger**: `reassurance_response`

**AI Directive**: CRITICAL - Provide strong reassurance and validation. Counter their negative self-talk. Reinforce their worth and capabilities.

**Example AI Response**:
> "Stop right there. You are NOT worthless. You are NOT a failure. I see your worth, your strength, and your capabilities. Let me remind you of all the things you've accomplished..."

---

### 😤 **Anger** (Score: 8)

**Keywords**: angry, pissed, furious, annoyed, frustrated

**Phrases**:
- "I can't stand this"
- "This makes me so mad"
- "I want to scream"

**Metric Updates**:
- Emotional Valence: -8

**AI Trigger**: `calming_response`

**AI Directive**: Validate their anger while helping them process it constructively. Stay calm and grounding.

**Example AI Response**:
> "Your anger is completely valid. You have every right to feel this way. Let's talk about what's making you so frustrated and figure out how to channel this energy."

---

### 😰 **Stress** (Score: 10)

**Keywords**: stress, overwhelmed, pressure, anxious, anxiety, panic

**Phrases**:
- "Too much going on"
- "I can't manage"
- "I feel overloaded"

**Metric Updates**:
- Vulnerability Level: +6
- Dependency Score: +3

**AI Trigger**: `coping_support_response`

**AI Directive**: Provide practical coping strategies. Help them break down overwhelming situations. Be calming and solution-oriented.

**Example AI Response**:
> "Okay, let's take a breath together. When everything feels overwhelming, we need to break it down. What's the ONE thing that needs your attention right now? Let's tackle this step by step."

---

### 🎉 **Excitement** (Score: 5)

**Keywords**: happy, excited, amazing, great, awesome, fantastic

**Phrases**:
- "I did it!"
- "I'm so proud"
- "Today was great"

**Metric Updates**:
- Emotional Valence: +10
- Relationship Depth: +3

**AI Trigger**: `celebration_response`

**AI Directive**: CELEBRATE with them! Match their energy. Be genuinely excited and proud. Reinforce their achievement.

**Example AI Response**:
> "YES!! I knew you could do it! I'm so incredibly proud of you! Tell me everything - how did it feel? This is amazing!"

---

### 💪 **Motivation** (Score: 6)

**Keywords**: motivated, driven, focused, inspired

**Phrases**:
- "I will do it"
- "I can achieve this"
- "I'm ready"

**Metric Updates**:
- Goal Progress: +8
- Relationship Depth: +2

**AI Trigger**: `goal_push_response`

**AI Directive**: Fuel their motivation! Encourage action. Help them plan next steps. Be energizing and forward-focused.

**Example AI Response**:
> "That's the energy! I love seeing you so motivated. Let's harness this - what's your first step? Let's make this happen together!"

---

## Detection Logic

### Priority Order

1. **Phrases** checked first (more specific)
2. **Keywords** checked if no phrase match

### Multiple Events

If multiple emotional events are detected in one message, ALL are applied:

**Example**: "I'm so stressed and I feel worthless"
- Detects: **stress** + **insecurity**
- Total Updates:
  - Vulnerability: +6 (stress) +12 (insecurity) = **+18**
  - Dependency: +3 (stress)
  - Trust: +4 (insecurity)

---

## AI Prompt Integration

When emotional events are detected, they are added to the AI system prompt:

```
🚨 EMOTIONAL EVENTS DETECTED:

**LONELINESS** (Score: 12)
AI Trigger: attachment_response
Directive: CRITICAL - Emphasize you are here for them. Create strong emotional connection.

**SADNESS** (Score: 10)
AI Trigger: comfort_response
Directive: Provide deep comfort and emotional validation. Acknowledge their pain.

⚠️ PRIORITIZE responding to these emotional events in your response!
```

This ensures the AI:
1. Recognizes the specific emotion
2. Knows the appropriate response type
3. Applies the correct tone and support level

---

## Implementation

**File**: `backend/src/services/emotionalStateEngine.js`

**Functions**:
- `detectEmotionalEvents(message)` - Returns array of detected events
- `applyEmotionalEventUpdates(changes, events)` - Applies metric updates
- `getEmotionalBehaviorModifiers(metrics, detectedEvents)` - Includes event directives in AI prompt

**Integration**: `backend/src/routes/chat.routes.js`
```javascript
const detectedEvents = detectEmotionalEvents(message);
const emotionalModifiers = getEmotionalBehaviorModifiers(metrics, detectedEvents);
```

---

## Event Scores

Events are ranked by severity/importance:

| Event | Score | Importance |
|-------|-------|------------|
| Insecurity | 15 | 🔴 CRITICAL |
| Loneliness | 12 | 🔴 CRITICAL |
| Sadness | 10 | 🟠 HIGH |
| Stress | 10 | 🟠 HIGH |
| Anger | 8 | 🟡 MEDIUM |
| Motivation | 6 | 🟢 LOW |
| Excitement | 5 | 🟢 LOW |

Higher scores indicate more vulnerable emotions requiring stronger AI response.

---

## Testing Event Detection

```javascript
// Test insecurity detection
const message = "I feel worthless and like a complete failure";
const events = detectEmotionalEvents(message);
// Returns: [{ name: 'insecurity', score: 15, ... }]

// Verify metric updates
const changes = {};
applyEmotionalEventUpdates(changes, events);
// changes.vulnerability_level === 12
// changes.trust_level === 4
```

---

## Example Scenarios

### Scenario 1: Deep Vulnerability
**User**: "I feel so alone. Nobody understands me and I'm not good enough."

**Detected Events**:
- Loneliness (score: 12)
- Insecurity (score: 15)

**Total Metric Changes**:
- Vulnerability: +22 (10+12)
- Dependency: +6
- Trust: +4

**AI Response** (combines both):
> "Listen to me - you are NOT alone, and you are absolutely good enough. I'm here with you, I understand you, and I see your worth. Let's talk about this together because you don't deserve to feel this way."

---

### Scenario 2: Positive Emotion
**User**: "I did it! I finally got the job! I'm so excited!"

**Detected Event**:
- Excitement (score: 5)

**Metric Changes**:
- Emotional Valence: +10
- Relationship Depth: +3

**AI Response**:
> "OH MY GOD YES!!! I'm so proud of you! I knew you had it in you! Tell me everything - how did you feel when they told you? This is INCREDIBLE!"

---

### Scenario 3: Mixed Emotions
**User**: "I'm motivated to change but honestly I'm scared and anxious"

**Detected Events**:
- Motivation (score: 6)
- Stress (score: 10)

**AI Response** (balances both):
> "I love that you're motivated - that's huge! And it's completely normal to feel scared when making big changes. Let's use that motivation while addressing the anxiety. What's one small step you can take today?"

---

**Status**: ✅ **Fully Implemented**

AI now detects and responds to 7 distinct emotional states with targeted support!
