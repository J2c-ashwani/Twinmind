# 📱 Mobile App Testing Guide

This guide will help you test the TwinMind Flutter mobile app on Android and iOS.

---

## ✅ Prerequisites Check

Your system status:
- ✅ Flutter 3.35.4 installed
- ✅ Android toolchain ready (SDK 36.1.0)
- ⚠️ Xcode installed (with simulator runtime issue)
- ✅ Chrome for web testing
- ✅ Android Studio installed
- ✅ VS Code available

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd mobile
flutter pub get
```

### 2. Configure Environment Variables

Create a `.env` file or use `--dart-define`:

```bash
# Option 1: Using dart-define flags (Recommended for testing)
flutter run --dart-define=SUPABASE_URL=http://localhost:54321 \
           --dart-define=SUPABASE_ANON_KEY=your_anon_key_here \
           --dart-define=API_URL=http://localhost:5001

# Option 2: For dev mode testing (bypass Supabase)
flutter run --dart-define=SUPABASE_URL=https://placeholder.supabase.co \
           --dart-define=SUPABASE_ANON_KEY=placeholder_key \
           --dart-define=API_URL=http://localhost:5001 \
           --dart-define=DEV_MODE=true
```

### 3. Run on Different Platforms

**Android Emulator:**
```bash
# List available devices
flutter devices

# Run on Android
flutter run -d android
```

**iOS Simulator (Mac only):**
```bash
# List iOS simulators
flutter devices

# Run on iOS
flutter run -d iPhone

# Or specific simulator
open -a Simulator
flutter run -d "iPhone 15 Pro"
```

**Web Browser:**
```bash
flutter run -d chrome
```

**Physical Device:**
```bash
# Enable USB debugging on Android phone
# Connect via USB

# List connected devices
flutter devices

# Run on physical device
flutter run
```

---

## 📱 Available Screens

The mobile app currently has these screens implemented:

1. **Welcome Screen** (`welcome_screen.dart`) - 7.4 KB
   - App introduction
   - Login/Sign up entry point

2. **Chat Screen** (`chat_screen.dart`) - 11.5 KB
   - Main chat interface
   - Message history
   - Input area

3. **Onboarding Screen** (`onboarding_screen.dart`) - 16.3 KB
   - Personality questionnaire
   - Multi-step form
   - Twin creation

4. **Achievements Screen** (`achievements_screen.dart`) - 8 KB
   - Badges and rewards
   - Progress tracking

5. **Daily Challenges** (`daily_challenges_screen.dart`) - 9.2 KB
   - Daily tasks
   - Streak tracking

6. **Insights Screen** (`insights_screen.dart`) - 10.7 KB
   - Analytics and reports
   - Mood tracking

7. **Memory Timeline** (`memory_timeline_screen.dart`) - 5 KB
   - Conversation memories
   - Important moments

8. **Referral Screen** (`referral_screen.dart`) - 11.2 KB
   - Invite friends
   - Referral tracking

---

## 🔧 Development Workflow

### Hot Reload
Press `r` in terminal while app is running to hot reload changes.

### Hot Restart
Press `R` in terminal to hot restart the entire app.

### Debug Console
```bash
# Run with verbose logging
flutter run -v

# Check for issues
flutter doctor -v
```

### Fix Xcode Simulator Issue (if needed)
```bash
# If you get simulator runtime errors
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch

# Re-install simulators if needed
xcode-select --print-path
xcrun simctl list runtimes
```

---

## 🌐 API Configuration

The mobile app needs to connect to your backend API. You have two options:

### Option A: Use Local Backend (Recommended for Testing)

1. Make sure backend is running:
   ```bash
   cd backend
   npm start  # Should be running on port 5001
   ```

2. For Android Emulator, use:
   ```
   API_URL=http://10.0.2.2:5001
   ```
   (10.0.2.2 is the special IP for localhost from Android emulator)

3. For iOS Simulator, use:
   ```
   API_URL=http://localhost:5001
   ```

4. For physical device on same WiFi, use your computer's IP:
   ```
   API_URL=http://192.168.1.X:5001
   ```
   (Find your IP with `ifconfig` on Mac)

### Option B: Use Deployed Backend

```
API_URL=https://your-backend.railway.app
```

---

## 📦 Build for Production

### Android APK
```bash
flutter build apk --release

# Output: build/app/outputs/flutter-apk/app-release.apk
```

### Android App Bundle (for Play Store)
```bash
flutter build appbundle --release

# Output: build/app/outputs/bundle/release/app-release.aab
```

### iOS (requires Mac + Xcode)
```bash
flutter build ios --release

# Then open in Xcode:
open ios/Runner.xcworkspace
```

---

## 🐛 Troubleshooting

### "Unable to get list of installed Simulator runtimes"

**Cause**: Xcode simulator runtime issue.

**Fix**:
```bash
# Option 1: Reset Xcode
sudo xcode-select --reset
sudo xcode-select --switch /Applications/Xcode.app

# Option 2: Re-install command line tools
xcode-select --install

# Option 3: Use Android instead
flutter run -d android
```

### "Gradle build failed"

**Fix**:
```bash
cd android
./gradlew clean
cd ..
flutter clean
flutter pub get
flutter run
```

### "CocoaPods not installed"

**Fix**:
```bash
sudo gem install cocoapods
cd ios
pod install
cd ..
```

### "Supabase initialization failed"

**Fix**: Use dev mode for testing without real Supabase:
```bash
flutter run --dart-define=DEV_MODE=true \
           --dart-define=API_URL=http://10.0.2.2:5001
```

### "Network request failed"

**Cause**: Mobile app can't reach backend.

**Fix**:
- For Android emulator: Use `http://10.0.2.2:5001` instead of localhost
- For iOS simulator: `http://localhost:5001` should work
- For physical device: Use your computer's local IP address
- Check firewall settings

---

## 📊 Testing Checklist

### Basic Functionality
- [ ] App launches without errors
- [ ] Welcome screen displays correctly
- [ ] Can navigate to chat screen
- [ ] Chat input accepts text
- [ ] Messages display properly
- [ ] Dark theme renders correctly

### API Integration
- [ ] Backend connection established
- [ ] Can send messages
- [ ] Receives AI responses
- [ ] Loading states work
- [ ] Error handling displays

### UI/UX
- [ ] Smooth animations
- [ ] No layout overflows
- [ ] Text is readable
- [ ] Buttons are tap-able
- [ ] Scrolling works smoothly

### Platform Specific
- [ ] Android navigation works
- [ ] iOS gestures work
- [ ] Web version responsive
- [ ] Physical device performance good

---

## 🎯 Next Steps

1. **Run the app**: `flutter run`
2. **Test basic flow**: Welcome → Chat → Send message
3. **Check other screens**: Navigate to achievements, insights, etc.
4. **Test with backend**: Make sure API calls work
5. **Report issues**: Note any bugs or missing features

---

## 📱 Quick Test Command

```bash
# Run this to test quickly (dev mode, Android)
cd mobile && \
flutter pub get && \
flutter run -d android \
  --dart-define=DEV_MODE=true \
  --dart-define=API_URL=http://10.0.2.2:5001 \
  --dart-define=SUPABASE_URL=https://placeholder.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=placeholder
```

---

## 🆘 Need Help?

- Check `flutter doctor -v` for environment issues
- View logs with `flutter logs`
- Clear cache: `flutter clean && flutter pub get`
- Restart IDE and simulators
- Check backend is running on correct port

**Ready to test? Let's go! 🚀**
