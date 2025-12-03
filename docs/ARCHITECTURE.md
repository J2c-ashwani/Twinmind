# TwinMind - System Architecture Document

## Executive Summary

TwinMind is an AI-powered personal digital twin platform built on a modern, scalable architecture. The system uses advanced personality modeling, vector-based semantic memory, and GPT-4o to create authentic AI conversations that mirror users' personalities, communication styles, and thinking patterns.

---

## Architecture Overview

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────────┐              ┌──────────────────┐    │
│  │   Next.js Web    │              │  Flutter Mobile  │    │
│  │   Application    │              │   (iOS/Android)  │    │
│  └────────┬─────────┘              └────────┬─────────┘    │
└───────────┼──────────────────────────────────┼──────────────┘
            │                                  │
            └──────────────┬───────────────────┘
                           │ HTTPS/REST
            ┌──────────────▼──────────────┐
            │   Node.js Express API        │
            │   (Deployed on Render)       │
            └──────────────┬──────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼────────┐  ┌──────▼──────┐  ┌──────▼──────┐
│   OpenAI API   │  │  Supabase   │  │   Stripe    │
│   (GPT-4o)     │  │  Platform   │  │  Payments   │
│                │  │             │  │             │
│ • Chat         │  │ • PostgreSQL│  │ • Checkout  │
│ • Embeddings   │  │ • Auth      │  │ • Webhooks  │
└────────────────┘  │ • Storage   │  └─────────────┘
                    │ • Vector DB │
                    └─────────────┘
```

---

## Core System Components

### 1. Personality Engine

**Purpose**: Generate comprehensive personality profiles from user responses

**Technology**: OpenAI GPT-4o with structured prompting

**Process**:
1. User completes 30-question assessment
2. Answers stored in PostgreSQL
3. GPT-4o analyzes responses using psychology-backed prompt
4. Generates structured personality JSON including:
   - Big Five traits (scored 1-100)
   - Strengths & weaknesses
   - Emotional patterns
   - Communication style
   - Decision-making preferences
   - Core values & motivations
5. Profile stored and used for all chat interactions

**Key Files**:
- `backend/src/services/personalityEngine.js`
- `database/seed_questions.sql`

---

### 2. Memory Engine

**Purpose**: Provide long-term semantic memory for context-aware conversations

**Technology**: OpenAI embeddings + Supabase pgvector

**Architecture**:
```
User Message
     ↓
Generate Embedding (text-embedding-3-small)
     ↓
Store in memory_vectors table (1536-dim vector)
     ↓
Retrieve similar memories (cosine similarity)
     ↓
Include in chat context
```

**Features**:
- Semantic search (not keyword matching)
- Automatic memory pruning for free tier
- Unlimited memories for Pro users
- Relevance threshold: 0.7 similarity

**Key Files**:
- `backend/src/services/memoryEngine.js`
- `database/schema.sql` (memory_vectors table, match_memories function)

---

### 3. Chat Engine

**Purpose**: Generate authentic twin responses using personality and memory

**Flow**:
```
1. User sends message
   ↓
2. Retrieve personality profile
   ↓
3. Semantic search for relevant memories (top 20)
   ↓
4. Get recent chat history (last 10 messages)
   ↓
5. Build system prompt:
   - Base personality instructions
   - Mode-specific modifications
   - Memory context
   ↓
6. Call GPT-4o with complete context
   ↓
7. Store message & response
   ↓
8. Generate embeddings & store as memories
   ↓
9. Return response to user
```

**Mode System**:
- **Normal Twin**: Authentic personality
- **Future Twin**: +5 years wiser, calmer
- **Dark Twin**: Brutally honest, unfiltered
- **Therapist Twin**: Compassionate, reflective

Each mode modifies the system prompt while maintaining core personality.

**Key Files**:
- `backend/src/services/chatEngine.js`
- `backend/src/services/modeManager.js`

---

### 4. Authentication & Authorization

**Technology**: Supabase Auth with Row Level Security (RLS)

**Supported Methods**:
- Email/Password
- Google OAuth
- Apple Sign-In (mobile)

**Security Model**:
- JWT tokens for API authentication
- RLS policies ensure users only access their own data
- Service role key for admin operations
- Refresh tokens handled by Supabase

**Key Files**:
- `backend/src/middleware/authMiddleware.js`
- `database/schema.sql` (RLS policies)

---

### 5. Subscription System

**Technology**: Stripe for payment processing

**Plans**:
| Feature | Free | Pro |
|---------|------|-----|
| Messages/month | 50 | Unlimited |
| Twin modes | Normal, Therapist | All 4 modes |
| Memory storage | 100 items | Unlimited |
| Price | $0 | $19/month or $180/year |

**Implementation**:
- Stripe Checkout for subscription creation
- Webhooks for subscription events
- Middleware enforces tier limits
- Graceful upgrade prompts in UI

**Key Files**:
- `backend/src/routes/subscription.routes.js`
- `backend/src/middleware/subscriptionMiddleware.js`

---

## Data Models

### Core Entities

**users**
- Basic profile information
- Links to Supabase auth.users

**personality_questions**
- 30 scientifically-designed questions
- Categorized by Big Five + additional dimensions

**personality_answers**
- User responses to questions
- Linked to specific user & question

**personality_profiles**
- Generated personality JSON
- Twin name and summary
- Versioned (regeneration support)

**chat_history**
- Conversation messages
- Sender (user/ai)
- Mode used

**memory_vectors**
- Text content
- 1536-dim embedding vector
- Metadata (type, timestamp, mode)

**subscriptions**
- Plan type (free/pro)
- Status (active/cancelled/expired)
- Stripe integration fields

---

## API Design

### RESTful Principles

All endpoints follow REST conventions:
- Use HTTP verbs appropriately (GET, POST, PUT, DELETE)
- Resource-based URLs
- JSON request/response bodies
- Standard HTTP status codes

### Authentication

Protected endpoints require bearer token:
```
Authorization: Bearer <supabase-jwt-token>
```

### Rate Limiting

- 100 requests per 15 minutes per IP
- Configured via express-rate-limit

### Error Handling

Consistent error response format:
```json
{
  "error": "Error message",
  "upgrade": true  // If requires subscription upgrade
}
```

---

## Frontend Architecture

### Web (Next.js 14)

**App Router Structure**:
- `/` - Landing page
- `/onboarding` - Personality questionnaire
- `/chat` - Main chat interface
- `/subscription` - Pricing & checkout
- `/profile` - Settings

**State Management**:
- React hooks for local state
- API calls via centralized `api.ts` client
- Supabase client for auth state

**Design System**:
- Tailwind CSS with custom config
- Glassmorphism utilities
- Gradient components
- Framer Motion animations

### Mobile (Flutter)

**Architecture**:
- Provider for state management
- Service layer for API calls
- Material 3 design with custom theme
- Platform-specific configurations

**Key Services**:
- `AuthService` - Supabase auth wrapper
- `ApiService` - Backend API client
- Local storage for offline support

---

## Deployment Architecture

### Production Environment

```
Web App (Vercel)
├── CDN edge network
├── Automatic HTTPS
└── Environment variables

Backend API (Render)
├── Auto-deploy from GitHub
├── Health check endpoint
├── Auto-scaling
└── Environment secrets

Database (Supabase Cloud)
├── PostgreSQL with pgvector
├── Automatic backups
├── Connection pooling
└── Built-in auth

External Services
├── OpenAI API (GPT-4o)
├── Stripe (payments)
└── App Stores (mobile distribution)
```

### CI/CD Pipeline

1. Code pushed to GitHub
2. Vercel auto-deploys web app
3. Render auto-deploys backend
4. Mobile apps built manually and submitted to stores

---

## Performance Considerations

### Optimizations

**Backend**:
- Database indexes on frequently queried fields
- Vector index (HNSW) for fast similarity search
- Connection pooling for database
- Caching of personality profiles (TODO)

**Frontend**:
- Next.js automatic code splitting
- Image optimization
- Static generation where possible
- Lazy loading of components

**AI Costs**:
- Use GPT-4o-mini for cheaper operations (TODO)
- Cache personality profiles (generated once)
- Optimize prompt lengths
- Batch embeddings when possible

### Scaling Strategy

**Phase 1 (0-1K users)**: Current architecture sufficient

**Phase 2 (1K-10K users)**:
- Add Redis for caching
- Implement request queuing
- Database read replicas
- Upgrade hosting tiers

**Phase 3 (10K+ users)**:
- Microservices architecture
- Self-hosted embedding model
- CDN for static assets
- Load balancers

---

## Security Measures

### Data Protection

- All data encrypted in transit (HTTPS)
- Database encryption at rest (Supabase)
- Row Level Security prevents data leakage
- JWT tokens with expiration
- Stripe webhook signature verification

### Input Validation

- Zod schemas for API validation (TODO)
- SQL injection prevention (parameterized queries)
- XSS protection (React escaping)
- CSRF tokens on state-changing operations

### Privacy

- User data isolated by RLS
- No data sharing between users
- Optional data deletion
- GDPR compliance ready

---

## Monitoring & Observability

### Logging

- Winston logger for structured logs
- Error tracking to console/files
- Request logging with IP and user agent

### Metrics to Track

- API response times
- OpenAI API costs
- Database query performance
- User sign-ups and conversions
- Subscription churn rate
- Message volume per user

### Recommended Tools (for production)

- Sentry for error tracking
- Datadog/New Relic for APM
- Stripe Dashboard for payments
- Supabase Dashboard for database
- OpenAI Dashboard for usage

---

## Future Enhancements

### Short Term
- [ ] Voice interaction (speech-to-text, text-to-speech)
- [ ] Twin avatar customization
- [ ] Export conversation history
- [ ] Personality insights dashboard

### Medium Term
- [ ] Multi-language support
- [ ] Twin-to-twin conversations
- [ ] Group chats with multiple twins
- [ ] Integration with calendar/email for context

### Long Term
- [ ] Custom AI model fine-tuning on user data
- [ ] AR/VR twin interactions
- [ ] Twin API for third-party integrations
- [ ] Enterprise version for teams

---

## Conclusion

TwinMind's architecture balances:
- **Simplicity**: Easy to understand and maintain
- **Scalability**: Can grow with user base
- **Cost-effectiveness**: Leverages managed services
- **Performance**: Fast response times
- **Security**: Privacy-first design

The modular design allows individual components to be upgraded or replaced without major refactoring, ensuring long-term sustainability.

---

**Architecture Version**: 1.0  
**Last Updated**: 2025-11-27  
**Author**: TwinMind Engineering Team
