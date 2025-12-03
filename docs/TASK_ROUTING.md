# Task-Based AI Routing Strategy 🧠

## Overview

TwinMind now uses a **Task-Based Routing System** that dynamically selects the best AI provider based on the user's intent and the active Twin Mode. This ensures that we use the "right tool for the job" rather than just a static fallback list.

## Routing Map

The system maps specific tasks to a prioritized list of AI providers optimized for that task.

| Task Type | Twin Mode | Priority 1 | Priority 2 | Priority 3 | Why? |
|-----------|-----------|------------|------------|------------|------|
| **Fast Chat** | (Short msgs) | **Groq** ⚡️ | OpenAI | Gemini | Instant responses (<0.5s) for "Hi", "Thanks" |
| **Deep Reasoning** | Future Twin | **Claude** 🧠 | Gemini | OpenAI | High IQ, complex logic, wisdom |
| **Emotional Support** | Therapist Twin | **Gemini** 💜 | Claude | OpenAI | High empathy, safety, nuance |
| **Personality Core** | Normal Twin | **OpenAI** 🎭 | Gemini | Claude | Consistent instruction following |
| **Creative Writing** | Dark Twin | **OpenRouter** 🎨 | Claude | Gemini | Diverse/Uncensored models for creativity |
| **Memory Analysis** | (Background) | **Cohere** 🗄️ | Gemini | OpenAI | Context-aware, RAG optimized |

## How It Works

1. **Mode Detection**: When a user sends a message, the system detects the active Twin Mode (e.g., "Therapist").
2. **Task Mapping**: The mode is mapped to a task type (e.g., "Therapist" -> `emotional_support`).
3. **Heuristic Override**: If the message is very short (e.g., "Hi"), it overrides the mode and uses `fast_chat` for speed.
4. **Provider Selection**: The system tries the Priority 1 provider for that task.
5. **Smart Fallback**: If Priority 1 is exhausted/down, it seamlessly falls back to Priority 2, then 3.

## Code Implementation

### `aiService.js`
Contains the `routingMap` and `getProvidersForTask(taskType)` logic.

### `chatEngine.js`
Determines the `taskType` based on the `mode` and passes it to the AI service.

```javascript
switch (mode) {
    case 'normal': taskType = 'personality_core'; break;
    case 'future': taskType = 'deep_reasoning'; break;
    case 'therapist': taskType = 'emotional_support'; break;
    case 'dark': taskType = 'creative_writing'; break;
}
```

## Benefits

- **⚡️ Speed**: Simple chats are instant (Groq).
- **🧠 Quality**: Complex advice uses the smartest models (Claude).
- **💜 Empathy**: Emotional support uses the most nuanced models (Gemini).
- **💰 Efficiency**: Uses the most appropriate free tier for each task.
