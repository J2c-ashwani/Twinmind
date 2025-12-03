# UI Logic Specification - Question Answers

This document defines the exact UI behavior and storage format for TwinMind personality questions.

---

## Question Types

### 1. Single Choice Questions

**Default Option Selected** (e.g., "Logic", "Curious and excited")
```
✅ Show: Radio button selected
❌ Hide: Text input field
✅ Enable: "Next" button immediately
💾 Store: { selected: "{{option}}", text: null }
```

**"Other" Option Selected**
```
✅ Show: Radio button selected
✅ Show: Text input field (appears below)
❌ Disable: "Next" button until text entered
✅ Enable: "Next" button when text is filled
💾 Store: { selected: "Other", text: "{{userInput}}" }
```

### 2. Text Questions (Q33)

**Open-ended text field**
```
✅ Show: Large text area
❌ Disable: "Next" button until text entered
✅ Enable: "Next" button when text filled
💾 Store: { selected: "text", text: "{{userInput}}" }
```

---

## Storage Format

### Database Schema

```sql
personality_answers:
  - selected_option: TEXT  (stores "option" | "Other" | "text")
  - answer_text: TEXT      (stores custom text or null)
```

### Examples

**Single Choice - Default Option**
```json
{
  "question_id": 1,
  "selected_option": "Curious and excited",
  "answer_text": null
}
```

**Single Choice - Other Option**
```json
{
  "question_id": 1,
  "selected_option": "Other",
  "answer_text": "I approach them with careful research first"
}
```

**Text Question**
```json
{
  "question_id": 33,
  "selected_option": "text",
  "answer_text": "I struggle with overthinking decisions"
}
```

---

## Validation Rules

### Screen Progression
A user can proceed to the next screen if **ALL** questions meet these conditions:

**For Single Choice:**
- ✅ An option is selected
- ✅ If "Other" selected → text input must be filled

**For Text:**
- ✅ Text input must be filled (minimum 1 character after trim)

### Implementation

```typescript
function canProgress(questions, answers) {
  return questions.every(q => {
    const answer = answers[q.id]
    if (!answer) return false
    
    if (q.type === 'text') {
      return answer.text?.trim().length > 0
    }
    
    if (!answer.selected) return false
    
    if (answer.selected === 'Other') {
      return answer.text?.trim().length > 0
    }
    
    return true // Default option selected
  })
}
```

---

## UI States

### Single Choice Question

| State | Radio Selected | Text Input Visible | Text Input Required | Next Button |
|-------|----------------|-------------------|---------------------|-------------|
| **Unanswered** | ❌ | ❌ | ❌ | Disabled |
| **Default Option** | ✅ | ❌ | ❌ | **Enabled** |
| **Other (empty)** | ✅ | ✅ | ✅ | Disabled |
| **Other (filled)** | ✅ | ✅ | ✅ | **Enabled** |

### Text Question

| State | Text Input Visible | Text Input Required | Next Button |
|-------|-------------------|---------------------|-------------|
| **Empty** | ✅ | ✅ | Disabled |
| **Filled** | ✅ | ✅ | **Enabled** |

---

## User Flow Examples

### Example 1: Single Choice (Default)
1. User sees question: "How do you recharge?"
2. User clicks: "Alone" ✅
3. Next button: **Immediately enabled** ✅
4. Stored: `{ selected: "Alone", text: null }`

### Example 2: Single Choice (Other)
1. User sees question: "How do you recharge?"
2. User clicks: "Other" ✅
3. Text field appears ✅
4. Next button: **Disabled** ❌
5. User types: "By watching movies"
6. Next button: **Enabled** ✅
7. Stored: `{ selected: "Other", text: "By watching movies" }`

### Example 3: Text Question
1. User sees question: "What is a weakness you rarely talk about?"
2. Text field visible ✅
3. Next button: **Disabled** ❌
4. User types: "I struggle with imposter syndrome"
5. Next button: **Enabled** ✅
6. Stored: `{ selected: "text", text: "I struggle with imposter syndrome" }`

---

## Implementation Files

### Web (Next.js)
- `web/src/app/onboarding/page.tsx`
- Functions: `handleAnswer()`, `handleTextAnswer()`, `canProgress()`

### Mobile (Flutter)
- `mobile/lib/screens/onboarding_screen.dart`
- Functions: `_handleAnswer()`, `_handleTextAnswer()`, `_canProgress()`

### Backend
- `backend/src/routes/personality.routes.js`
- Endpoint: `POST /api/personality/submit-answers`

---

## Key Differences from Generic Forms

🚀 **Fast UX**: Single choice questions enable "Next" immediately (no "Other" text required upfront)

🎯 **Smart Validation**: Only enforces text input when:
- "Other" is selected
- Question is text type

💾 **Structured Storage**: Uses `selected_option` field to distinguish between:
- Predefined choices
- "Other" with custom text
- Open-ended text responses

---

**Status**: ✅ Implemented in v1.1
**Last Updated**: 2025-11-27
