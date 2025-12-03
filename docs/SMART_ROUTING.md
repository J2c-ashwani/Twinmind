# Smart AI Routing System 🧠

## Overview

The TwinMind backend now features an **intelligent AI routing system** that proactively manages API quotas, rate limits, and provider availability. Instead of just reacting to errors, it tracks usage and health to ensure optimal performance.

## Key Features

### 1. 📊 Quota Tracking
The system tracks the number of requests made to each provider daily.
- **Gemini**: 1000 req/day
- **OpenAI**: 500 req/day
- **Groq**: 1000 req/day
- **Claude**: 50 req/day
- **OpenRouter**: 1000 req/day
- **Cohere**: 100 req/day
- **HuggingFace**: 1000 req/day

### 2. ❄️ Smart Cooldowns
When a provider fails, the system intelligently assigns a cooldown period based on the error type:
- **Rate Limit / Quota Exceeded**: 1 hour cooldown (marked as exhausted)
- **Network / Timeout**: 5 minute cooldown
- **Other Errors**: Immediate retry with next provider

### 3. 🔄 Automatic Daily Reset
At midnight local server time, all quotas and exhausted statuses are automatically reset, giving a fresh start for the new day.

### 4. 🛡️ Proactive Routing
Before making a request, the system checks:
1. Is the provider marked as exhausted?
2. Is the provider in a cooldown period?
3. Has the daily request limit been reached?

If any of these are true, it **automatically skips** that provider and moves to the next one in the priority list, saving time and latency.

## Priority Chain

1. **Gemini** (Primary)
2. **OpenAI** (High Quality Fallback)
3. **Groq** (Fastest Fallback)
4. **Claude** (Nuanced Fallback)
5. **OpenRouter** (Free Model Rotation)
6. **Cohere** (Chat Fallback)
7. **HuggingFace** (Last Resort)

## Monitoring

You can view the real-time status of the routing system via the stats endpoint:

```json
{
  "routingStatus": {
    "Gemini": {
      "requestsToday": 150,
      "errorsToday": 0,
      "isExhausted": false,
      "cooldownUntil": null
    },
    "OpenAI": {
      "requestsToday": 501,
      "errorsToday": 1,
      "isExhausted": true,
      "cooldownUntil": "2023-11-30T14:00:00.000Z"
    }
  }
}
```

## Benefits

- **Zero Downtime**: Users never experience "Quota Exceeded" errors.
- **Lower Latency**: Skips known-bad providers instantly.
- **Cost Efficiency**: Maximizes free tiers before moving to others.
- **Self-Healing**: Automatically recovers after cooldowns or daily resets.
