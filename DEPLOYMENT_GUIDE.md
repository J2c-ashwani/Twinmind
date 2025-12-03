# TwinMind - Complete Deployment Guide

## 🚀 **Deployment Overview**

This guide covers deploying the complete TwinMind application across all platforms.

---

## 1. Backend Deployment

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- Supabase account

### Steps

```bash
# 1. Set up database
cd database
psql -U postgres -d twinmind < schema.sql
psql -U postgres -d twinmind < addiction_features_schema.sql
psql -U postgres -d twinmind < conversation_memory_schema.sql

# 2. Install dependencies
cd ../backend
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 4. Start server
npm start
```

### Environment Variables
```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key
STRIPE_SECRET_KEY=your_stripe_key
JWT_SECRET=your_jwt_secret
```

---

## 2. Web App Deployment (Vercel)

### Steps

```bash
# 1. Install dependencies
cd web
npm install

# 2. Build
npm run build

# 3. Deploy to Vercel
vercel --prod
```

### Environment Variables (Vercel)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=your_backend_url
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

### Custom Domain
1. Add domain in Vercel dashboard
2. Configure DNS records
3. Enable SSL

---

## 3. Mobile App Deployment

### iOS (App Store)

```bash
# 1. Install dependencies
cd mobile
flutter pub get

# 2. Configure
# Edit ios/Runner/Info.plist with app details

# 3. Build
flutter build ios --release

# 4. Open in Xcode
open ios/Runner.xcworkspace

# 5. Archive and upload to App Store Connect
```

### Android (Play Store)

```bash
# 1. Configure signing
# Create android/key.properties

# 2. Build
flutter build appbundle --release

# 3. Upload to Play Console
# Upload build/app/outputs/bundle/release/app-release.aab
```

### Environment Configuration
Create `lib/config/env.dart`:
```dart
class Env {
  static const String apiUrl = 'YOUR_API_URL';
  static const String supabaseUrl = 'YOUR_SUPABASE_URL';
  static const String supabaseKey = 'YOUR_SUPABASE_KEY';
}
```

---

## 4. Database Setup

### Supabase Configuration

1. Create new project
2. Enable pgvector extension
3. Run migrations
4. Set up Row Level Security (RLS)
5. Configure authentication

### Required Extensions
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

---

## 5. Third-Party Services

### OpenAI
- Sign up at platform.openai.com
- Create API key
- Add to backend .env

### Stripe
- Create account
- Get API keys
- Configure webhooks
- Add to backend and frontend

### Firebase (Mobile Notifications)
- Create Firebase project
- Download google-services.json (Android)
- Download GoogleService-Info.plist (iOS)
- Enable Cloud Messaging

---

## 6. Post-Deployment

### Verification Checklist
- [ ] Backend health check: `GET /health`
- [ ] Database connections working
- [ ] Web app loads correctly
- [ ] Mobile apps connect to backend
- [ ] Authentication flow works
- [ ] Stripe payments process
- [ ] Push notifications send
- [ ] Real-time features work

### Monitoring
- Set up error tracking (Sentry)
- Configure analytics
- Monitor API performance
- Track user metrics

---

## 7. CI/CD (Optional)

### GitHub Actions (Web)
```yaml
name: Deploy Web
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build
      - uses: amondnet/vercel-action@v20
```

---

## 8. Scaling Considerations

### Backend
- Use PM2 for process management
- Set up load balancer
- Enable caching (Redis)
- Optimize database queries

### Database
- Set up read replicas
- Configure connection pooling
- Index optimization
- Regular backups

---

**Deployment Time**: 2-4 hours
**Status**: Ready for production! 🎉
