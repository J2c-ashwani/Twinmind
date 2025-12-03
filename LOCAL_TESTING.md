# Local Testing Guide - TwinMind

Quick setup to test TwinMind on your local machine.

---

## Prerequisites

1. **Node.js** 18+ installed
2. **Supabase account** (free tier works)
3. **OpenAI API key** (https://platform.openai.com/api-keys)

---

## Quick Setup (5 minutes)

### Step 1: Setup Supabase

1. Go to https://supabase.com and create a free project
2. In SQL Editor, run:
   - Copy/paste `database/schema.sql` → Run
   - Copy/paste `database/seed_questions.sql` → Run
3. Go to Settings → API → Copy these values:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### Step 2: Configure Backend

```bash
cd /Users/ashwanikumar/.gemini/antigravity/scratch/twinmind/backend

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
NODE_ENV=development
PORT=3001

SUPABASE_URL=your-supabase-url-here
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

JWT_SECRET=local-dev-secret-change-in-production

WEB_APP_URL=http://localhost:3000
MOBILE_APP_SCHEME=twinmind://

FREE_TIER_MONTHLY_MESSAGES=50
FREE_TIER_MEMORY_LIMIT=100

# Stripe (optional for local testing)
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-secret
STRIPE_PRICE_ID_PRO_MONTHLY=price_your-id
STRIPE_PRICE_ID_PRO_YEARLY=price_your-id
EOF

# Edit the .env file with your actual keys
nano .env  # or use your preferred editor

# Create logs directory
mkdir -p logs

# Start backend server
npm run dev
```

**Backend will run at**: http://localhost:3001

### Step 3: Configure Web App

Open a new terminal:

```bash
cd /Users/ashwanikumar/.gemini/antigravity/scratch/twinmind/web

# Install dependencies
npm install

# Create .env.local file
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
EOF

# Edit with your actual keys
nano .env.local

# Install PostCSS and Tailwind if needed
npm install -D tailwindcss postcss autoprefixer

# Start development server
npm run dev
```

**Web app will run at**: http://localhost:3000

---

## 🧪 Testing URLs

Once both servers are running:

### Main Application
- **Landing Page**: http://localhost:3000
- **Onboarding**: http://localhost:3000/onboarding
- **Chat**: http://localhost:3000/chat
- **Subscription**: http://localhost:3000/subscription

### API Endpoints
- **Health Check**: http://localhost:3001/health
- **Get Questions**: http://localhost:3001/api/personality/questions
- **API Base**: http://localhost:3001/api

### Test API with curl

```bash
# Health check
curl http://localhost:3001/health

# Get personality questions (no auth required)
curl http://localhost:3001/api/personality/questions
```

---

## 🎯 Complete Test Flow

### 1. Create Account
1. Go to http://localhost:3000
2. Click "Create Your Twin"
3. Sign up with email (Supabase will send confirmation email)
4. Or use temporary email for testing

### 2. Complete Personality Assessment
1. Answer 30 questions (split into 4 steps)
2. Click "Create My Twin"
3. Wait for AI to generate personality (~10-20 seconds)
4. You'll see your twin's introduction

### 3. Chat with Your Twin
1. Send a message in Normal mode
2. Try different modes (Future, Dark, Therapist)
3. Check if memories are recalled in conversation

### 4. Test Subscription (Optional)
1. Go to http://localhost:3000/subscription
2. Try to use Future or Dark twin mode (should prompt upgrade)
3. For real Stripe testing, create test products in Stripe Dashboard

---

## 🐛 Troubleshooting

### Backend won't start
- Check if port 3001 is already in use: `lsof -i :3001`
- Verify environment variables are set correctly
- Check logs in `backend/logs/`

### Web app won't start
- Check if port 3000 is already in use: `lsof -i :3000`
- Run `npm install` again
- Clear Next.js cache: `rm -rf .next`

### Database errors
- Verify Supabase SQL scripts ran successfully
- Check RLS policies are enabled
- Ensure service role key is correct

### OpenAI errors
- Verify API key is valid
- Check you have credits in OpenAI account
- Try with `gpt-4o-mini` for cheaper testing (update .env)

### CORS errors
- Ensure `WEB_APP_URL` in backend .env matches web app URL
- Check backend is running on port 3001

---

## 📊 Monitor During Testing

### Backend Logs
```bash
# Watch backend logs
tail -f backend/logs/combined.log
```

### Supabase Dashboard
- Monitor database queries
- Check authentication logs
- View real-time table data

### OpenAI Dashboard
- Track API usage: https://platform.openai.com/usage
- Monitor costs

---

## 💰 Cost While Testing

**Estimated costs for testing**:
- Supabase: Free tier (plenty for testing)
- OpenAI API: ~$0.50-1.00 for 10-20 test conversations
- Stripe: No charge for test mode

**Tips to minimize costs**:
1. Use fewer questions during testing (modify seed_questions.sql)
2. Use `gpt-4o-mini` instead of `gpt-4o` for cheaper testing
3. Reduce memory retrieval limit (fewer vectors = less cost)

---

## 🚀 Ready to Test!

1. Start backend: `cd backend && npm run dev`
2. Start web: `cd web && npm run dev`
3. Open browser: http://localhost:3000
4. Create account and test!

**Happy Testing!** 🎉

---

## Next Steps After Testing

- Review [DEPLOYMENT.md](file:///Users/ashwanikumar/.gemini/antigravity/scratch/twinmind/docs/DEPLOYMENT.md) to deploy to production
- Customize personality questions
- Adjust twin mode prompts
- Configure real Stripe products
