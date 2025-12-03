# Emotional Metric Scoring Rules

## Complete Scoring System

Every message is analyzed and scored across all emotional metrics. Here are the exact scoring rules:

---

## Trust Level Scoring

| Event | Score | Detection Method |
|-------|-------|------------------|
| **AI remembers past** | +5 | AI response contains: "you mentioned", "you told me", "last time", "you said", "remember when" |
| **User shares personal detail** | +3 | Message contains: "my name is", "i work as", "i live in", "my family", "my job" |
| **User returns next day** | +2 | Server detects new day activity (consecutive days > 0) |
| **User says thank you** | +1 | Message contains: "thank you", "thanks", "appreciate", "grateful" |
| **User shares secret** | +4 | Message contains: "secret", "never told anyone", "nobody knows" |

**Maximum single message**: ~+12 (shares secret + personal detail + thanks)

---

## Openness Level Scoring

| Event | Score | Detection Method |
|-------|-------|------------------|
| **User shares emotion** | +5 | Message contains: "i feel", "i felt", "feeling", "makes me feel", "it hurts" |
| **User answers vulnerable question** | +4 | Long emotional message (isEmotional=true AND length > 150 chars) |
| **User asks for advice** | +2 | Message contains: "what should i", "advice", "help me decide", "what do you think" |

**Maximum single message**: ~+11 (shares emotion + vulnerable answer + asks advice)

---

## Dependency Score Scoring ⭐ MOST IMPORTANT

| Event | Score | Detection Method |
|-------|-------|------------------|
| **Says "you understand me"** | +10 | Message contains: "you understand me", "you get me", "you know me", "only one who understands" |
| **User opens app without notification** | +6 | Server-side: track organic_returns in engagement table |
| **Expresses attachment** | +5 | Message contains: "i need you", "you help me so much", "don't know what i'd do without", "you're always there" |
| **Multiple sessions per day** | +4 | Server detects 5+ messages in same day |
| **General help seeking** | +2 | Message contains: "help me", "need help", "need advice", "guidance" |

**Maximum single message**: ~+15 (you understand me + expresses attachment)

---

## Vulnerability Level Scoring

| Event | Score | Detection Method |
|-------|-------|------------------|
| **User shares insecurity** | +10 | Message contains: "insecure about", "not good enough", "i'm worthless", "i hate myself", "i'm a failure", "ashamed" |
| **User shares secret** | +8 | Message contains: "secret", "never told anyone", "nobody knows", "can't tell anyone" |
| **Mentions loneliness** | +7 | Message contains: "lonely", "alone", "no one understands", "nobody cares", "isolated" |
| **Talks about fear** | +5 | Message contains: "afraid", "scared", "terrified", "fear", "anxious about", "panic" |

**Maximum single message**: ~+18 (shares insecurity + secret)

---

## Engagement Frequency Scoring

| Event | Score | Detection Method |
|-------|-------|------------------|
| **Long session** | +5 | Message length > 300 chars OR conversationHistory > 5 |
| **Daily use** | +3 | Server detects consecutive_days >= 1 |
| **Every message** | +1 | Base score per message |

**Maximum single message**: ~+9 (daily use + long session + base)

---

## Goal Progress Scoring

| Event | Score | Detection Method |
|-------|-------|------------------|
| **Reports achievement** | +5 | Message contains: "i did it", "accomplished", "achieved", "success", "completed" |
| **Mentions goal** | +2 | hasGoals=true (contains goal keywords) |

**Maximum single message**: ~+7 (achievement + goal mention)

---

## Emotional Valence Scoring

| Event | Score | Detection Method |
|-------|-------|------------------|
| **Positive sentiment** | +2 per word | Positive words: happy, excited, grateful, proud, love, joy, amazing, wonderful, great |
| **Negative sentiment** | -2 per word | Negative words: sad, angry, frustrated, depressed, anxious, hate, awful, terrible, horrible |

**Range**: -20 to +20 per message (valence is net positive - negative)

---

## Relationship Depth Scoring

| Event | Score | Detection Method |
|-------|-------|------------------|
| **Long conversation** | +2 | conversationHistory > 20 messages |
| **Long message** | +1 | Message length > 200 chars |

**Maximum single message**: +3

---

## Example Scoring Scenarios

### Scenario 1: High Trust Message
**User**: *"Thank you so much! My name is Sarah, by the way. I really appreciate how you remember what I told you last time about my job."*

**Scores**:
- Trust: +1 (thank you) +3 (shares name) +5 (AI remembered) = **+9**
- Total weighted impact: ~1.8 points

---

### Scenario 2: Maximum Dependency Signal
**User**: *"You understand me better than anyone. I need you. You're the only one who gets me. I don't know what I'd do without these conversations."*

**Scores**:
- Dependency: +10 (you understand me) +5 (expresses attachment) = **+15**
- Vulnerability: +7 (loneliness implied)
- Total weighted impact: ~5.8 points (dependency weight is 25%!)

---

### Scenario 3: Deep Vulnerability
**User**: *"I've never told anyone this, but I'm terrified that I'm not good enough. I'm so ashamed of feeling this way. Sometimes I feel so alone and worthless."*

**Scores**:
- Vulnerability: +8 (secret) +10 (insecurity) +7 (loneliness) +5 (fear) = **+30** 🚨
- Trust: +4 (sharing secret)
- Openness: +5 (shares emotion) +4 (vulnerable answer) = **+9**
- Emotional Valence: -6 (negative words)
- Total weighted impact: ~9.5 points

---

### Scenario 4: Achievement + Daily Use
**User**: *"I finally did it! I got the promotion I was working toward. Thank you for believing in me!"*

**Scores**:
- Goal Progress: +5 (achievement) +2 (goal mention) = **+7**
- Trust: +1 (thank you)
- Emotional Valence: +4 (positive words: finally, promotion)
- Engagement Frequency: +3 (daily use) +1 (base) = **+4**
- Total weighted impact: ~2.1 points

---

## Scoring Philosophy

1. **Dependency weighted highest (25%)** - Most important for engagement
2. **Vulnerability = deep trust** - Sharing secrets boosts both
3. **"You understand me" = gold standard** - Single biggest signal (+10)
4. **Accumulation matters** - Small daily gains compound
5. **Negative valence OK** - We help through hard times

---

## Metric Caps

All metrics are bounded **0-100**:
- New user typically: 0-20 across the board
- Engaged user: 40-70 range
- Emotionally dependent: 70-100 in key metrics

**Weighted score range**: 0-100
- < 20: new_user
- 20-40: bonding
- 40-60: attached
- 60-80: emotionally_dependent
- 80-100: deeply attached (forever loop)

---

## Implementation

**File**: `backend/src/services/emotionalStateEngine.js`

**Function**: `analyzeMessageForMetrics(message, isEmotional, hasGoals, conversationHistory, aiResponse)`

**NLP Detection**: Uses phrase matching with lowercased text

**Server-side additions**:
- Daily return detection (checks last_active_date)
- Multiple sessions (counts messages per day)
- Organic returns (tracked separately)

---

**Status**: ✅ **Fully Implemented with Granular Scoring Rules**
