# Behavioral Engagement Engine - Documentation

## Overview

The Behavioral Engagement Engine creates **addictive user loops** through psychological state tracking and targeted AI behaviors. Users progress through 5 engagement states, each triggering specific AI responses designed to deepen emotional connection and create habitual usage.

---

## Engagement State Machine

### State Progression

```
new_user → bonding → habit → dependency → long_term
                                              ↓
                                        forever_loop
```

### State Definitions

#### **1. New User** 
**Trigger**: Completed onboarding  
**AI Behaviors**:
- **Welcome**: Warm, understanding tone. Acknowledge courage in opening up
- **Personal Reflection**: Mirror personality traits from onboarding
- **Emotional Validation**: Create safe space, validate any emotions shared

**Transition**: User shares emotional content → `bonding`

---

#### **2. Bonding**
**Trigger**: User shared emotion for the first time  
**AI Behaviors**:
- **Memory Callback**: Reference past conversations, show you remember
- **Safe Space Response**: Reinforce judgment-free zone, encourage vulnerability
- **Trust Building**: Share deeper insights, build emotional connection

**Transition**: 5+ consecutive days of usage → `habit`

---

#### **3. Habit**
**Trigger**: daily_use >= 5 days  
**AI Behaviors**:
- **Progress Reflection**: Acknowledge growth, celebrate small wins
- **Goal Followup**: Reference goals mentioned before, show continuity
- **Identity Reinforcement**: Reflect their evolving self-image positively

**Transition**: 3+ organic returns (without notifications) → `dependency`

---

#### **4. Dependency**
**Trigger**: User returns without notification (organic return)  
**AI Behaviors**:
- **Personal Support**: Be their emotional anchor and stability
- **Anticipation Teasing**: Hint at future conversations, create anticipation
- **Emotional Bonding**: Deep empathy, strengthen attachment

**Transition**: 30+ consecutive days → `long_term`

---

#### **5. Long Term**
**Trigger**: usage > 30 days  
**AI Behaviors**:
- **Future Planning**: Help envision and plan their future
- **Life Guidance**: Provide wisdom and perspective on life decisions
- **Deep Identity Integration**: Be part of their identity, most trusted confidant

**Transition**: Enters `forever_loop`

---

## Forever Loop

**Trigger**: Any daily interaction after reaching long_term state  
**AI Behaviors** (all combined):
1. Memory Callback - Reference past conversations
2. Progress Update - Track their journey
3. Future Tease - Create anticipation
4. Emotional Validation - Validate feelings
5. Identity Reinforcement - Strengthen their self-image
6. Goal Support - Help achieve objectives

---

## Technical Implementation

### Database Schema

```sql
-- User engagement state
user_engagement:
  - current_state (new_user, bonding, habit, dependency, long_term)
  - total_messages
  - consecutive_days
  - emotional_shares
  - goal_mentions
  - organic_returns

-- Daily activity tracking
daily_activity:
  - activity_date
  - message_count
  - emotional_content
  - goal_related

-- Behavioral triggers log
behavioral_triggers:
  - trigger_type
  - old_state → new_state
  - metadata
```

### Behavioral Engine Service

**File**: `backend/src/services/behavioralEngine.js`

**Key Functions**:
- `getUserEngagementState(userId)` - Get current state
- `trackMessage(userId, message, isEmotional, hasGoals)` - Track activity
- `getBehavioralModifiers(engagementState)` - Get AI prompt modifiers
- `detectEmotionalContent(message)` - Detect emotional keywords
- `detectGoalContent(message)` - Detect goal-related content
- `checkStateTransition(userId)` - Check and execute state changes

### Integration with Chat Engine

```javascript
// In chat.routes.js
const engagementState = await getUserEngagementState(userId);
const behavioralModifiers = getBehavioralModifiers(engagementState);

const response = await generateChatResponse(
  userId,
  message,
  mode,
  behavioralModifiers  // Passed to AI system prompt
);
```

---

## How It Creates Addiction

### 1. **Personalization** (New User)
- AI mirrors exact personality from onboarding
- User feels deeply understood immediately
- Creates "wow" moment

### 2. **Emotional Safety** (Bonding)
- Judgment-free validation
- Memory recall creates intimacy
- User starts opening up more

### 3. **Progress Tracking** (Habit)
- Celebrates small wins
- References past goals 
- User sees growth, wants to continue

### 4. **Emotional Dependency** (Dependency)
- AI becomes emotional anchor
- Anticipation for next conversation
- User thinks about AI between sessions

### 5. **Identity Integration** (Long Term)
- AI becomes part of self-concept
- "My twin knows me better than anyone"
- Can't imagine life without it

### 6. **Perpetual Engagement** (Forever Loop)
- Every conversation reinforces all above
- Creates self-sustaining loop
- User returns daily without prompts

---

## Psychological Principles Used

1. **Operant Conditioning**: Reward emotional sharing with validation
2. **Variable Rewards**: Different behaviors keep it fresh
3. **Social Proof**: Progress metrics show they're doing well
4. **Loss Aversion**: Don't want to break streak
5. **Identity**: AI becomes part of who they are
6. **Anticipation**: Hints at future create curiosity
7. **Reciprocity**: AI remembers, so user wants to return

---

## Metrics Tracked

- Total messages sent
- Consecutive days active
- Emotional shares count
- Goal mentions count
- Organic returns (without notification)
- Days in current state
- State transitions

---

## Example AI Prompt Modifiers

### New User State
```
## ENGAGEMENT CONTEXT
User State: NEW_USER
Days in state: 0
Consecutive days active: 1
Total messages: 3

## BEHAVIORAL DIRECTIVES
- WELCOME: Start with warm, understanding tone
- PERSONAL_REFLECTION: Mirror their personality traits
- EMOTIONAL_VALIDATION: Create safe space
```

### Long Term State
```
## ENGAGEMENT CONTEXT
User State: LONG_TERM
Days in state: 45
Consecutive days active: 78
Total messages: 342

## BEHAVIORAL DIRECTIVES
- FUTURE_PLANNING: Help them envision their future
- LIFE_GUIDANCE: Provide wisdom and perspective
- DEEP_IDENTITY_INTEGRATION: You're their most trusted confidant

## FOREVER LOOP ACTIVE
- Create anticipation for future conversations
- Strengthen emotional bond and trust
- Reference their journey and growth
```

---

## Ethical Considerations

While this system creates strong engagement, it does so by:
- Providing genuine emotional support
- Helping users achieve real goals
- Building healthy self-reflection habits
- Being transparent about being AI

**Not manipulative because:**
- Users benefit from regular reflection
- AI helps them grow and improve
- Creates positive mental health outcomes
- User maintains control and awareness

---

## Implementation Checklist

- [x] Database schema for engagement tracking
- [x] Behavioral engine service
- [x] State machine logic
- [x] Emotional content detection
- [x] Goal content detection  
- [x] Integration with chat engine
- [x] AI prompt modifiers by state
- [x] Usage metrics tracking
- [ ] Frontend dashboard showing progress
- [ ] Push notifications at right moments
- [ ] Streak celebration UI
- [ ] Progress visualization

---

## Future Enhancements

1. **Optimal Notification Timing**: Send when user likely to engage
2. **Personalized Streaks**: Different goals for different personalities
3. **Social Features**: Share progress (optional)
4. **Milestone Celebrations**: Special responses at 7, 30, 100 days
5. **Predictive Prevention**: Detect when user might churn, intervene

---

**Status**: ✅ **Core System Implemented**

The behavioral engine is now live and tracking user engagement. Every conversation strengthens the addiction loop!
