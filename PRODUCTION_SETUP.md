# 🚀 Production Setup Guide

This guide walks you through setting up TwinMind for real users in production.

---

## 📋 Prerequisites Checklist

Before you start, you'll need accounts for:
- [ ] Supabase (Database & Authentication)
- [ ] At least one AI provider (Gemini recommended)
- [ ] Payment gateway (Razorpay for India, Paddle/Lemonsqueezy for international)
- [ ] Domain name
- [ ] Hosting platform (Vercel for frontend, Railway/Render for backend)

---

## 1️⃣ Supabase Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Key**: `eyJhbGc...` (public key)
   - **Service Role Key**: `eyJhbGc...` (secret key - keep private!)

### Step 2: Create Database Tables

Run these SQL commands in Supabase SQL Editor:

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Personality questions
CREATE TABLE personality_questions (
  id SERIAL PRIMARY KEY,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL, -- 'text', 'multiple_choice', 'multiple_select'
  options_json JSONB,
  screen_number INTEGER NOT NULL,
  question_order INTEGER NOT NULL,
  allow_other BOOLEAN DEFAULT false
);

-- User personality answers
CREATE TABLE personality_answers (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES personality_questions(id),
  selected_option TEXT,
  answer_text TEXT,
  answer_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- User personality profiles
CREATE TABLE user_personality_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  twin_name TEXT NOT NULL,
  personality_type TEXT,
  core_traits JSONB,
  communication_style JSONB,
  emotional_profile JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat history
CREATE TABLE chat_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  sender TEXT NOT NULL, -- 'user' or 'ai'
  mode TEXT DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL, -- 'free' or 'pro'
  status TEXT NOT NULL, -- 'active', 'cancelled', 'expired'
  payment_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Metric events (for mood tracking, etc.)
CREATE TABLE metric_events (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metric_value NUMERIC,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_personality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own answers" ON personality_answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own answers" ON personality_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own profile" ON user_personality_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_personality_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_personality_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own chat" ON chat_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat" ON chat_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own metrics" ON metric_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own metrics" ON metric_events FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Step 3: Populate Personality Questions

Insert at least 10-35 onboarding questions:

```sql
-- Example questions
INSERT INTO personality_questions (question_text, question_type, options_json, screen_number, question_order, allow_other) VALUES
('What is your name?', 'text', NULL, 1, 1, false),
('How old are you?', 'text', NULL, 1, 2, false),
('What best describes you?', 'multiple_choice', '["Introvert", "Extrovert", "Ambivert"]', 2, 3, true);
-- Add more questions...
```

### Step 4: Configure Authentication

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable **Email** authentication
3. Optional: Enable Google/GitHub OAuth for social login
4. Configure email templates for password reset, etc.

---

## 2️⃣ AI Provider Setup

### Option A: Google Gemini (Recommended - Free Tier)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add to `.env`: `GEMINI_API_KEY=your_key_here`

### Option B: Groq (Fast & Free)

1. Go to [Groq Console](https://console.groq.com)
2. Create an API key
3. Add to `.env`: `GROQ_API_KEY=your_key_here`

### Option C: OpenAI (Paid but reliable)

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Create an API key
3. Add to `.env`: `OPENAI_API_KEY=your_key_here`

**Recommendation**: Start with Gemini (free 2M tokens/day) + Groq (free 14K requests/day) for redundancy.

---

## 3️⃣ Environment Variables

### Backend `.env`

```bash
# Server
NODE_ENV=production
PORT=5001

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# AI Providers (add at least one)
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key  # optional

# JWT
JWT_SECRET=your_random_secret_string_here

# Payment Gateways
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
PADDLE_VENDOR_ID=xxx
PADDLE_API_KEY=xxx

# Usage Limits
FREE_TIER_MONTHLY_MESSAGES=50
PRO_TIER_MONTHLY_MESSAGES=1000
```

### Frontend `.env.local`

```bash
# API
NEXT_PUBLIC_API_URL=https://your-backend-domain.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Payment (Razorpay)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxx

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

---

## 4️⃣ Payment Gateway Setup

### Razorpay (For India)

1. Sign up at [razorpay.com](https://razorpay.com)
2. Complete KYC verification
3. Get Live API keys from Dashboard → Settings → API Keys
4. Enable Payment Gateway and set up webhooks
5. Add webhook URL: `https://your-backend.com/api/webhooks/razorpay`

### Paddle/Lemonsqueezy (International)

1. Sign up at [paddle.com](https://paddle.com) or [lemonsqueezy.com](https://lemonsqueezy.com)
2. Complete merchant verification
3. Create products for Free/Pro plans
4. Get API keys
5. Set up webhooks for subscription events

---

## 5️⃣ Remove Dev Mode

### Backend Changes

**File**: `backend/src/middleware/authMiddleware.js`

Remove these lines:
```javascript
// Dev mode bypass
if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
  req.userId = 'dev-user-123';
  return next();
}
```

**File**: `backend/src/middleware/subscriptionMiddleware.js`

Remove dev mode bypasses in:
- `checkSubscription()`
- `checkUsageLimits()`

### Frontend Changes

**File**: `web/src/app/login/page.tsx`

Remove the "Dev Mode: Quick Login" button section.

**File**: `web/src/app/chat/page.tsx`

Remove dev token fallback:
```typescript
// Remove this section
else {
  const storageStr = localStorage.getItem('user-storage');
  if (storageStr) {
    const storage = JSON.parse(storageStr);
    if (storage.state?.user?.id === 'dev-user-123') {
      token = 'dev-token';
    }
  }
}
```

---

## 6️⃣ Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repo
4. Add environment variables from `.env.local`
5. Deploy!

### Backend (Railway/Render)

**Railway**:
1. Go to [railway.app](https://railway.app)
2. Create new project from GitHub repo
3. Select `backend` folder as root
4. Add environment variables
5. Deploy

**Render**:
1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repo
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add environment variables

---

## 7️⃣ Domain Setup

1. **Frontend**: Point your domain to Vercel
   - Add A record to Vercel IP
   - Or add CNAME to Vercel domain

2. **Backend**: Point API subdomain to Railway/Render
   - Add CNAME: `api.yourdomain.com` → `your-app.railway.app`

3. **Update .env**: Change `NEXT_PUBLIC_API_URL` to your custom domain

---

## 8️⃣ Final Checklist

- [ ] Supabase database tables created with RLS enabled
- [ ] At least one AI provider API key added
- [ ] Environment variables set in production
- [ ] Payment gateway configured and tested
- [ ] Dev mode removed from code
- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Railway/Render
- [ ] Custom domains configured
- [ ] SSL certificates active (should be automatic)
- [ ] Test complete user flow: signup → onboarding → chat → subscription

---

## 📊 Cost Estimate (Monthly)

| Service | Free Tier | Paid (After limits) |
|---------|-----------|---------------------|
| **Supabase** | 500MB DB, 2GB transfer | $25/month for Pro |
| **Gemini AI** | 2M tokens/day | Free (for now) |
| **Groq** | 14.4K requests/day | Free |
| **Vercel** | 100GB bandwidth | $20/month for Pro |
| **Railway** | $5 credit/month | ~$10-20/month |
| **Domain** | N/A | $10-15/year |
| **Total** | ~$5-10/month | ~$50-80/month |

With free AI tiers, you can support **1000+ users** for under $50/month! 🎉

---

## 🆘 Troubleshooting

**Issue**: "Invalid Supabase credentials"
- Check if URL and keys are correct
- Ensure you're using the right key (anon vs service role)

**Issue**: "AI not responding"
- Verify API keys are active
- Check rate limits on AI provider dashboard
- Test with curl to isolate frontend/backend

**Issue**: "Payment webhook not working"
- Verify webhook URL is publicly accessible
- Check webhook signature validation
- Review webhook logs in payment dashboard

---

## 🎯 Next Steps

1. Set up monitoring (Sentry, LogRocket)
2. Add analytics (Google Analytics, Mixpanel)
3. Configure email service (SendGrid, Resend)
4. Set up CI/CD pipelines
5. Add more comprehensive tests
6. Create admin dashboard for user management

---

**Ready to launch? Let's go! 🚀**
