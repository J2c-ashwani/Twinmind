# TwinGenie - AI Personal Digital Twin Engine

<div align="center">

![TwinGenie Logo](https://via.placeholder.com/150x150/9333EA/FFFFFF?text=TwinGenie)

**Create your AI Digital Twin that thinks, talks, and behaves exactly like you**

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](https://twingenie.app)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Flutter](https://img.shields.io/badge/Flutter-3.0-blue)](https://flutter.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

[Features](#features) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Documentation](#documentation)

</div>

---

## 🌟 Overview

TwinGenie is a cutting-edge AI platform that creates personalized digital twins capable of thinking, conversing, and behaving like their human counterparts. Using advanced personality modeling and multi-provider AI, TwinGenie analyzes 35 carefully crafted questions to build a comprehensive psychological profile, enabling authentic AI conversations.

### Key Highlights

- **🧠 AI Personality Engine**: Big Five-inspired questionnaire analyzing traits, emotional patterns, and decision-making styles
- **💬 Intelligent Chat**: Context-aware conversations powered by vector-based semantic memory
- **🎭 4 Twin Modes**: Normal, Future, Honest (Dark), and Reflective (Therapist) twin perspectives
- **📱 Cross-Platform**: Beautiful web and mobile apps with seamless data sync
- **🔒 Privacy-First**: Your data, your twin - complete ownership and control

---

## ✨ Features

### Personality Assessment
- 35 Big Five-inspired questions
- Big Five personality traits analysis
- Emotional intelligence mapping
- Communication style profiling
- Decision-making pattern recognition

### AI Twin Capabilities
- **Normal Twin**: Your authentic digital self
- **Future Twin**: 5-years-wiser version of you
- **Dark Twin**: Brutally honest, unfiltered thoughts
- **Therapist Twin**: Compassionate self-reflection companion

### Advanced Memory System
- Vector-based semantic memory storage
- Context-aware conversation continuity
- Long-term memory retention
- Relevant memory retrieval

### Subscription Plans
- **Free**: 50 messages/month, Normal & Therapist modes
- **Pro**: Unlimited messages, all 4 modes, unlimited memory

## 🚀 Deployment

We have a comprehensive deployment guide available.

👉 **[Read the Deployment Guide](DEPLOYMENT_GUIDE.md)**

### Quick Start (Production)

1.  **Backend**: Deploy `/backend` to Railway/Render. Set `NODE_ENV=production`.
2.  **Web**: Deploy `/web` to Vercel. Set `NEXT_PUBLIC_API_URL`.
3.  **Mobile**: Deploy `/mobile/build/web` to Firebase Hosting.

See `DEPLOYMENT_GUIDE.md` for detailed step-by-step instructions.

---

## 🛠 Tech Stack

### Backend
- **Node.js** + Express - REST API
- **Supabase** - Authentication, Database, Vector Storage
- **PostgreSQL** with **pgvector** - Semantic search
- **OpenAI GPT-4o** - Personality generation & chat
- **Stripe** - Payment processing

### Frontend
- **Next.js 14** - Web application (TypeScript)
- **Flutter** - Mobile apps (iOS & Android)
- **Tailwind CSS** - Premium glassmorphism design
- **Framer Motion** - Smooth animations

### Infrastructure
- **Vercel** - Web hosting
- **Render/Railway** - Backend hosting
- **Supabase Cloud** - Database & auth
- **Stripe** - Payments

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Flutter 3.0+
- Supabase account
- OpenAI API key
- Stripe account

### Quick Start

#### 1. Clone Repository

```bash
git clone https://github.com/yourusername/twinmind.git
cd twinmind
```

#### 2. Setup Database

1. Create Supabase project
2. Run SQL files:
   ```sql
   -- In Supabase SQL Editor
   -- Run: database/schema.sql
   -- Run: database/seed_questions.sql
   ```

#### 3. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

#### 4. Setup Web App

```bash
cd web
npm install
cp .env.local.example .env.local
# Edit .env.local with your credentials
npm run dev
```

#### 5. Setup Mobile App

```bash
cd mobile
flutter pub get
# Add your environment variables
flutter run
```

Visit `http://localhost:3000` for the web app!

---

## 📁 Project Structure

```
twinmind/
├── backend/                 # Node.js API
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   │   ├── personalityEngine.js
│   │   │   ├── chatEngine.js
│   │   │   ├── memoryEngine.js
│   │   │   └── modeManager.js
│   │   ├── middleware/     # Auth & validation
│   │   └── server.js       # Express app
│   └── package.json
│
├── web/                    # Next.js web app
│   ├── src/
│   │   ├── app/           # Pages (App Router)
│   │   ├── components/    # React components
│   │   └── lib/           # API client, types
│   ├── tailwind.config.ts
│   └── package.json
│
├── mobile/                # Flutter mobile app
│   ├── lib/
│   │   ├── screens/      # UI screens
│   │   ├── services/     # API & auth
│   │   ├── models/       # Data models
│   │   └── main.dart
│   └── pubspec.yaml
│
├── database/             # SQL schemas
│   ├── schema.sql
│   └── seed_questions.sql
│
└── docs/                 # Documentation
    └── DEPLOYMENT.md
```

---

## 📖 Documentation

### API Endpoints

#### Personality
- `GET /api/personality/questions` - Get questionnaire
- `POST /api/personality/submit-answers` - Submit answers
- `POST /api/personality/generate` - Generate personality profile
- `GET /api/personality/profile` - Get user's profile

#### Chat
- `POST /api/chat/message` - Send message, get AI response
- `GET /api/chat/history` - Get conversation history
- `GET /api/chat/modes` - Get available twin modes

#### Subscription
- `GET /api/subscription/status` - Get subscription status
- `POST /api/subscription/create-checkout` - Start Stripe checkout
- `POST /api/subscription/webhook` - Stripe webhook handler

### Environment Variables

See `.env.example` files in each directory for required variables.

---

## 🎨 Design System

### Colors
- **Primary Purple**: `#9333EA`
- **Secondary Blue**: `#3B82F6`
- **Background**: Dark gradient (`#0F0F1E` → `#1A0B2E`)

### Components
- Glassmorphism cards with backdrop blur
- Gradient text and buttons
- Smooth animations and transitions
- Responsive layouts

---

## 🧪 Testing

### Backend
```bash
cd backend
npm test
```

### Web
```bash
cd web
npm test
```

### Mobile
```bash
cd mobile
flutter test
```

---

## 🚢 Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete deployment instructions.

**Quick Deploy:**
1. Deploy backend to Render/Railway
2. Deploy web to Vercel
3. Setup Supabase
4. Configure Stripe
5. Build mobile apps

---

## 💰 Pricing

### Free Tier
- 50 messages per month
- Normal Twin mode
- Therapist Twin mode
- Basic personality profile

### Pro - $19/month
- **Unlimited** messages
- All 4 twin modes
- Future Twin mode
- Dark Twin mode
- Unlimited memory
- Priority support

### Pro Yearly - $180/year
- Everything in Pro
- **Save 21%** (2 months free)

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
 
All rights reserved. Confidential and proprietary software. Unauthorized copying, transfer, or distribution of this software and associated documentation is strictly prohibited.
 
---
 
## 🙏 Acknowledgments
 
- **OpenAI, Anthropic & Groq** for multi-model AI capabilities
- **Supabase** for backend & pgvector vector infrastructure
- **Vercel & Render** for cloud deployments
- **Google Play** for mobile app ecosystem
- **Flutter** & **Next.js** teams for frontend frameworks
 
---
 
## 📧 Contact
 
Website: [https://twingenie.app](https://twingenie.app)  
Inquiries: twingenie.app@gmail.com

---

<div align="center">

**Built with ❤️ using AI-first architecture**

[⬆ back to top](#twinmind---ai-personal-digital-twin-engine)

</div>
