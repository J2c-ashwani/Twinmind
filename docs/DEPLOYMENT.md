# TwinMind - Deployment Guide

Complete deployment instructions for all TwinMind components.

---

## Prerequisites

Before deploying, ensure you have:

- [x] Supabase account (https://supabase.com)
- [x] OpenAI API key (https://platform.openai.com)
- [x] Stripe account (https://stripe.com)
- [x] Vercel account for web app (https://vercel.com)
- [x] Render/Railway account for backend (https://render.com)
- [x] Google Cloud Console for mobile OAuth (https://console.cloud.google.com)

---

## Step 1: Setup Supabase

### 1.1 Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Fill in project details:
   - Name: `twinmind`
   - Database Password: (generate a strong password)
   - Region: Choose closest to your users

### 1.2 Run Database Migration

1. Go to SQL Editor in Supabase dashboard
2. Copy and paste the contents of `database/schema.sql`
3. Click "Run"
4. Copy and paste the contents of `database/seed_questions.sql`
5. Click "Run"

### 1.3 Configure Authentication

1. Go to Authentication > Providers
2. Enable Email provider
3. Enable Google provider:
   - Create OAuth credentials in Google Cloud Console
   - Add Client ID and Client Secret
4. For mobile, enable Apple provider (iOS requirement)

### 1.4 Get API Keys

1. Go to Settings > API
2. Copy:
   - Project URL (`SUPABASE_URL`)
   - `anon` public key (`SUPABASE_ANON_KEY`)
   - `service_role` secret key (`SUPABASE_SERVICE_ROLE_KEY`)

---

## Step 2: Deploy Backend API

### 2.1 Prepare for Deployment

``` bash
cd backend
npm install
```

### 2.2 Deploy to Render

1. Push code to GitHub repository
2. Go to https://render.com
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `twinmind-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Choose appropriate plan

### 2.3 Set Environment Variables

In Render dashboard, add these environment variables:

```
NODE_ENV=production
PORT=3001

SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-webhook-secret>
STRIPE_PRICE_ID_PRO_MONTHLY=<your-monthly-price-id>
STRIPE_PRICE_ID_PRO_YEARLY=<your-yearly-price-id>

JWT_SECRET=<generate-random-secret>

WEB_APP_URL=https://your-app.vercel.app
MOBILE_APP_SCHEME=twinmind://

FREE_TIER_MONTHLY_MESSAGES=50
FREE_TIER_MEMORY_LIMIT=100
```

### 2.4 Configure Stripe Webhooks

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. URL: `https://your-api.onrender.com/api/subscription/webhook`
4. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret

---

## Step 3: Deploy Web App (Next.js)

### 3.1 Configure Environment Variables

Create `.env.local` in the `web` directory:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_API_URL=https://your-api.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
```

### 3.2 Deploy to Vercel

```bash
cd web
npm install
npm run build  # Test build locally first
```

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the web directory
3. Follow the prompts
4. Or deploy via Vercel dashboard:
   - Go to https://vercel.com
   - Import your GitHub repository
   - Select the `web` directory as root
   - Add environment variables
   - Click "Deploy"

### 3.3 Configure Custom Domain (Optional)

1. Go to Vercel project settings
2. Add your custom domain
3. Update DNS records as instructed

---

## Step 4: Create Stripe Products

### 4.1 Create Pricing Plans

1. Go to Stripe Dashboard > Products
2. Create "Pro Monthly" product:
   - Name: TwinMind Pro Monthly
   - Price: $19/month
   - Billing: Recurring monthly
   - Copy the Price ID
3. Create "Pro Yearly" product:
   - Name: TwinMind Pro Yearly
   - Price: $180/year (or $15/month)
   - Billing: Recurring yearly
   - Copy the Price ID
4. Add these Price IDs to your environment variables

---

## Step 5: Build Mobile Apps

### 5.1 Flutter Configuration

1. Update `mobile/.env`:

```
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-anon-key>
API_URL=https://your-api.onrender.com
```

2. Update Google Sign-In configuration:
   - iOS: Update `Info.plist`
   - Android: Update `build.gradle`

### 5.2 Build Android APK

```bash
cd mobile
flutter clean
flutter pub get
flutter build apk --release
```

APK location: `build/app/outputs/flutter-apk/app-release.apk`

### 5.3 Build iOS App

```bash
flutter build ios --release
```

1. Open `ios/Runner.xcworkspace` in Xcode
2. Configure signing & capabilities
3. Archive and upload to App Store Connect

### 5.4 Submit to Stores

**Google Play:**
1. Create account at https://play.google.com/console
2. Create new app
3. Upload APK/AAB
4. Fill in store listing
5. Submit for review

**Apple App Store:**
1. Create account at https://developer.apple.com
2. Create app in App Store Connect
3. Upload via Xcode or Transporter
4. Fill in app information
5. Submit for review

---

## Step 6: Post-Deployment Testing

### 6.1 Test Checklist

- [ ] User can sign up with email
- [ ] User can sign in with Google
- [ ] Personality questionnaire loads
- [ ] Twin profile generates successfully
- [ ] Chat interface works in all modes
- [ ] Free tier limits are enforced
- [ ] Stripe checkout works
- [ ] Pro features unlock after payment
- [ ] Mobile app connects to backend
- [ ] Cross-platform data syncs

### 6.2 Monitor Services

1. **Supabase**: Monitor database usage
2. **Render/Railway**: Check API logs
3. **Vercel**: Monitor web app analytics
4. **OpenAI**: Track API usage and costs
5. **Stripe**: Monitor payment events

---

## Step 7: Ongoing Maintenance

### Update Checklist

**Backend Updates:**
```bash
git pull origin main
cd backend
npm install
# Render will auto-deploy if connected to GitHub
```

**Web App Updates:**
```bash
git pull origin main
cd web
npm install
npm run build
# Vercel will auto-deploy if connected to GitHub
```

**Mobile App Updates:**
1. Update version in `pubspec.yaml`
2. Rebuild apps
3. Submit to stores

### Database Migrations

When updating database schema:
1. Test changes in development
2. Backup production database
3. Run migration SQL in Supabase SQL Editor
4. Verify data integrity

---

## Troubleshooting

### Common Issues

**Issue: CORS errors**
- Solution: Update `CORS` origins in backend `server.js`

**Issue: Supabase RLS blocking requests**
- Solution: Review RLS policies in `schema.sql`

**Issue: OpenAI rate limits**
- Solution: Implement request queuing or upgrade OpenAI plan

**Issue: Stripe webhooks failing**
- Solution: Verify webhook secret and endpoint URL

### Support Resources

- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- Flutter Docs: https://flutter.dev/docs
- Stripe Docs: https://stripe.com/docs

---

## Cost Estimation

**Free Tier (Proof of Concept):**
- Supabase: Free tier (500MB database, 50K requests/month)
- Render: Free tier available
- Vercel: Free tier (100GB bandwidth)
- OpenAI: Pay per use (~$0.03/1K tokens)

**Production (100 active users):**
- Supabase Pro: $25/month
- Render Basic: $7/month
- Vercel Pro: $20/month
- OpenAI API: ~$50-100/month (varies by usage)
- Stripe: 2.9% + $0.30 per transaction
- **Total: ~$100-150/month + transaction fees**

---

## Security Checklist

- [ ] All environment variables secured
- [ ] Supabase RLS policies enabled
- [ ] HTTPS enforced on all endpoints
- [ ] API rate limiting configured
- [ ] Input validation on all endpoints
- [ ] JWT tokens expire appropriately
- [ ] Stripe webhook signatures verified
- [ ] User data encrypted at rest (Supabase handles this)
- [ ] Regular security audits scheduled

---

## Scaling Considerations

**Up to 1,000 users:**
- Current setup should handle this
- Monitor OpenAI API costs

**1,000 - 10,000 users:**
- Upgrade Render to Standard plan
- Consider caching layer (Redis)
- Implement request queuing
- Optimize database queries

**10,000+ users:**
- Move to dedicated infrastructure (AWS/GCP)
- Implement CDN for static assets
- Database read replicas
- Load balancing
- Consider self-hosting embeddings model

---

**Deployment Complete! 🎉**

Your TwinMind application is now live and ready to create AI digital twins!
