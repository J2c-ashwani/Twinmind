# Deployment Guide

## 1. Web Deployment (Recommended)
Your app works perfectly on the web. You can deploy it for free using **Vercel** or **Netlify**.

### Steps:
1. Locate the build folder:
   `twinmind/mobile/build/web`
   
2. Upload this folder to any static hosting provider.
   - **Netlify:** Drag and drop the `web` folder.
   - **Vercel:** Run `vercel deploy` inside the folder.

### Environment Variables
Ensure your Backend URL is accessible.
- If deploying Backend to Cloud (e.g. Render), update `api_service.dart` with the cloud URL before building.
- Currently it points to local IP `192.168.1.5`. This ONLY works if you access the deployed site from the SAME WiFi.

## 2. Backend Deployment
Deploy the `backend` folder to a Node.js host.

### Recommended Providers:
- **Render.com** (Free tier available)
- **Railway.app**

### Steps for Render:
1. Push code to GitHub.
2. Create **New Web Service**.
3. Point to `backend` directory.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Add Environment Variables:
   - `SUPABASE_URL`: (From your .env)
   - `SUPABASE_ANON_KEY`: (From your .env)
   - `SUPABASE_SERVICE_ROLE_KEY`: (From your .env)
   - `OPENAI_API_KEY`, `GEMINI_API_KEY`, etc.
   
## 3. Android APK
Building the APK requires a properly configured Android Studio environment.
Current Local Error: `Java Version Conflict (Desugaring)`.
To fix: Install OpenJDK 17 and update JAVA_HOME, then try building again.
