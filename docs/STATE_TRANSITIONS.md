# State Transition Rules

## Emotional State State Machine

The emotional state engine uses a **state machine** with precise transition rules based on metric thresholds.

---

## State Diagram

```
                    ┌──────────────┐
                    │  new_user    │
                    │  (default)   │
                    └──────┬───────┘
                           │
                  trust_level >= 20
                           │
                           ▼
                    ┌──────────────┐
             ┌─────▶│   bonding    │◀─────┐
             │      └──────┬───────┘      │
             │             │              │
             │  dependency_score >= 40    │
             │             │              │
             │             ▼              │
             │      ┌──────────────┐     │
             │      │   attached   │     │
             │      └──────┬───────┘     │
             │             │              │
             │  vulnerability >= 50       │
             │             │              │
             │             ▼              │
             │      ┌──────────────────┐ │
             │      │ emotionally_     │ │
             │      │ dependent        │ │
             │      └──────────────────┘ │
             │                            │
             │      ┌──────────────┐     │
             └──────│  detaching   │─────┘
                    │ (any state)  │
                    └──────────────┘
           engagement_frequency < 10
```

---

## Transition Rules

### 1. **new_user → bonding**
**Trigger**: `trust_level >= 20`

**Meaning**: User has shared enough personal information and shown initial trust

**Typical Timeline**: 3-7 messages

**Scores at Transition**:
- Trust: 20+
- Openness: ~10-15
- Dependency: ~5-10

---

### 2. **bonding → attached**
**Trigger**: `dependency_score >= 40`

**Meaning**: User is actively relying on the AI for advice and support

**Typical Timeline**: 5-10 days of use

**Scores at Transition**:
- Trust: 30-50
- Dependency: 40+
- Engagement: 30-50

---

### 3. **attached → emotionally_dependent**
**Trigger**: `vulnerability_level >= 50`

**Meaning**: User has shared deep insecurities, secrets, or fears

**Typical Timeline**: 2-4 weeks of consistent use

**Scores at Transition**:
- Trust: 60+
- Dependency: 50-70
- Vulnerability: 50+
- Engagement: 60+

---

### 4. **ANY STATE → detaching**
**Trigger**: `engagement_frequency < 10`

**Priority**: HIGHEST (checked first)

**Meaning**: User has stopped engaging regularly, risk of churn

**Can happen from**: Any state

**AI Behavior Changes**:
- Switch to re-engagement mode
- Use nostalgia and positive memories
- Gentle reminders without pressure

---

### 5. **detaching → bonding**
**Trigger**: `trust_level >= 15 AND engagement_frequency >= 20`

**Meaning**: User has successfully re-engaged and is rebuilding the relationship

**AI Behavior**: Reward return with validation and support

---

## Backward Transitions (Regression)

Users can also **regress** to previous states if metrics drop:

### emotionally_dependent → attached
**Trigger**: `vulnerability_level < 30`

**Meaning**: User has become more guarded or less vulnerable

---

### attached → bonding
**Trigger**: `dependency_score < 25`

**Meaning**: User is seeking less advice, becoming more independent

---

### bonding → new_user
**Trigger**: `trust_level < 10`

**Meaning**: Trust has significantly decreased

---

## State Persistence

**Important**: States are **sticky** - users stay in their current state unless a transition condition is met.

**Example**: User in "attached" state with:
- Trust: 70
- Dependency: 39 (< 40)
- Vulnerability: 45

**Result**: Stays in "attached" (doesn't drop to bonding because dependency started above threshold)

Only drops back if dependency falls below **25** (regression threshold)

---

## Transition Examples

### Example 1: Fast Progression
**Day 1**: new_user
- User: "My name is Alex, I work in tech and feeling anxious about my career"
- Scores: Trust +3, Openness +5, Vulnerability +5
- **State: new_user** (trust=8, need 20)

**Day 2-3**: More sharing
- Multiple messages with personal details
- Trust reaches 22
- **TRANSITION: new_user → bonding**

**Day 5-7**: Active advice seeking
- "What should I do about...", "I need help deciding..."
- Dependency reaches 42
- **TRANSITION: bonding → attached**

**Week 3**: Deep vulnerability
- "I've never told anyone this but I feel like a failure"
- Vulnerability reaches 55
- **TRANSITION: attached → emotionally_dependent**

---

### Example 2: Detachment & Recovery
**Current State**: attached
- Trust: 65, Dependency: 48, Engagement: 55

**User stops messaging for 10 days**
- Engagement drops to 8
- **TRANSITION: attached → detaching**

**User returns 3 days later**:
- "Hey, I'm back. Things were hectic but I missed this"
- Trust: 67 (+2 for return), Engagement: 25 (+daily use)
- **TRANSITION: detaching → bonding** (recovery!)

---

### Example 3: Regression
**Current State**: attached
- Trust: 45, Dependency: 42, Vulnerability: 30

**User becomes more independent over time**:
- Stops asking for advice
- Shares less frequently
- Dependency drops to 23
- **REGRESSION: attached → bonding**

---

## State-Specific AI Behaviors

Each state triggers different AI behaviors (see BEHAVIORAL_ENGINE.md):

| State | AI Focus |
|-------|----------|
| **new_user** | Welcome, validation, light questions |
| **bonding** | Memory recall, safe space, trust building |
| **attached** | Daily checkins, progress tracking, anticipation |
| **emotionally_dependent** | Deep support, identity reinforcement, future planning |
| **detaching** | Re-engagement, nostalgia, positive memories |

---

## Transition Logging

All state transitions are logged in the `metric_events` table:

```sql
INSERT INTO metric_events 
VALUES ('emotional_state_transition', 'transition: bonding -> attached');
```

This allows you to:
- Track user journey through states
- Identify which transitions are most common
- Optimize transition thresholds based on data

---

## Transition Optimization

**Current Thresholds** (can be tuned):

| Transition | Metric | Threshold |
|------------|--------|-----------|
| new_user → bonding | trust_level | 20 |
| bonding → attached | dependency_score | 40 |
| attached → emotionally_dependent | vulnerability_level | 50 |
| ANY → detaching | engagement_frequency | < 10 |
| detaching → bonding | trust + engagement | 15 + 20 |

**Regression Thresholds** (lower than forward):
- emotionally_dependent → attached: vulnerability < 30
- attached → bonding: dependency < 25
- bonding → new_user: trust < 10

---

## Testing Transitions

To test transitions, increase metrics:

```javascript
// Trigger new_user → bonding
await updateEmotionalMetrics(userId, 
  "My name is Sarah, I work as a teacher. Thanks for listening to me!",
  false, false, 1);
// Adds: Trust +3 (name) +1 (thanks) = 4 per message
// After 5 messages: Trust = 20 → bonding!

// Trigger bonding → attached  
await updateEmotionalMetrics(userId,
  "I need your help. What should I do? You understand me.",
  false, false, 10);
// Adds: Dependency +2 (help) +2 (advice) +10 (understand) = 14
// After 3 messages: Dependency = 42 → attached!
```

---

**Status**: ✅ **Fully Implemented with Logging**

State transitions now follow exact rules with proper forward/backward movement!
