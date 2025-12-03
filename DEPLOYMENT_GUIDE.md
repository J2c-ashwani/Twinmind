# 🚀 TwinMind Deployment Guide

This guide provides step-by-step instructions for deploying the TwinMind application stack to production.

## 🏗️ Architecture Overview

- **Backend**: Node.js/Express (Deploy to Railway or Render)
- **Web App**: Next.js 14 (Deploy to Vercel)
- **Mobile App**: Flutter (Deploy Web build to Firebase Hosting or Vercel)
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini / Groq / OpenAI (External APIs)

---

## 1️⃣ Backend Deployment (Railway/Render)

### Option A: Railway (Recommended)

1.  **Sign Up/Login**: Go to [railway.app](https://railway.app)
2.  **New Project**: Click "New Project" -> "Deploy from GitHub repo"
3.  **Select Repo**: Choose `J2c-ashwani/Twinmind`
4.  **Configure Service**:
    *   Select the repository.
    *   Go to "Settings" -> "Root Directory" and set it to `/backend`.
    *   Railway should auto-detect Node.js.
5.  **Environment Variables**:
    *   Go to the "Variables" tab.
    *   Copy values from your local `.env` (excluding dev-specific ones).
    *   **Crucial**: Set `NODE_ENV=production`.
    *   **Crucial**: Set a strong `JWT_SECRET`.
6.  **Deploy**: Railway will automatically build and deploy.
7.  **Public URL**: Go to "Settings" -> "Domains" to generate a public URL (e.g., `twinmind-backend.up.railway.app`).

### Option B: Render

1.  **Sign Up/Login**: Go to [render.com](https://render.com)
2.  **New Web Service**: Click "New" -> "Web Service"
3.  **Connect Repo**: Select `J2c-ashwani/Twinmind`
4.  **Settings**:
    *   **Root Directory**: `backend`
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
5.  **Environment Variables**:
    *   Add all required variables (Supabase keys, AI keys, etc.).
    *   Set `NODE_ENV=production`.
6.  **Deploy**: Click "Create Web Service".

---

## 2️⃣ Web App Deployment (Vercel)

1.  **Sign Up/Login**: Go to [vercel.com](https://vercel.com)
2.  **Add New Project**: Click "Add New..." -> "Project"
3.  **Import Repo**: Import `J2c-ashwani/Twinmind`
4.  **Configure Project**:
    *   **Framework Preset**: Next.js
    *   **Root Directory**: Edit and select `web`.
5.  **Environment Variables**:
    *   Copy from `web/.env.local`.
    *   Update `NEXT_PUBLIC_API_URL` to your **deployed backend URL** (from Step 1).
    *   Update `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
6.  **Deploy**: Click "Deploy". Vercel will build and host the site.

---

## 3️⃣ Mobile App Deployment (Flutter Web)

Since we built the Flutter app for web (`flutter build web --release`), you can host the static files.

### Option A: Firebase Hosting (Recommended)

1.  **Install CLI**: `npm install -g firebase-tools`
2.  **Login**: `firebase login`
3.  **Init**: Run `firebase init` in the `mobile` directory.
    *   Select **Hosting**.
    *   Select your Firebase project.
    *   **Public directory**: `build/web`
    *   **Configure as single-page app**: Yes
4.  **Deploy**: `firebase deploy`

### Option B: Vercel (Alternative)

1.  **New Project**: In Vercel, import the same repo again.
2.  **Root Directory**: Select `mobile`.
3.  **Build Settings**:
    *   **Framework Preset**: Other
    *   **Build Command**: `flutter build web --release` (Note: Vercel needs Flutter installed, which might require a custom build script. Firebase is easier for Flutter).
    *   *Alternative*: Commit the `build/web` folder (not recommended usually, but easiest for static hosting if CI isn't set up) and point Vercel to that.

---

## 4️⃣ Post-Deployment Checklist

- [ ] **Update Redirect URLs**: Go to Supabase Auth settings and add your new production URLs (Web and Mobile) to "Site URL" and "Redirect URLs".
- [ ] **Verify Connectivity**: Open the Web App and check if it can log in and chat (connects to Backend).
- [ ] **Payment Gateway**: Configure Razorpay webhooks to point to your production backend URL.
- [ ] **Custom Domains**: Configure custom domains in Vercel/Railway if you have them.

---

## 🆘 Troubleshooting

*   **CORS Errors**: Check `ALLOWED_ORIGINS` in backend env vars. It must include your Vercel/Firebase frontend URLs.
*   **Auth Errors**: Check Supabase Redirect URLs.
*   **Build Fails**: Check build logs. Ensure all dependencies are in `package.json`.
