import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'screens/welcome_screen.dart';
import 'screens/chat_screen.dart';
import 'screens/login_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/subscription_screen.dart';
import 'screens/life_coach_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/privacy_screen.dart';
import 'screens/terms_screen.dart';
import 'screens/insights_screen.dart';
import 'screens/achievements_screen.dart';
import 'screens/memory_timeline_screen.dart';
import 'screens/main_screen.dart';
import 'screens/daily_challenges_screen.dart';
import 'screens/growth_story_screen.dart';
import 'screens/twin_match_screen.dart';
import 'screens/program_detail_screen.dart';
import 'screens/coaching_session_screen.dart';
import 'services/auth_service.dart';
import 'services/api_service.dart';
import 'services/notification_service.dart';

import 'dart:async';

Future<void> main() async {
  runZonedGuarded(() async {
    print('TwinMind App Starting...');
    WidgetsFlutterBinding.ensureInitialized();
    
    // Initialize Firebase and Notifications (skip on web)
    if (!kIsWeb) {
      try {
        await Firebase.initializeApp();
        print('✅ Firebase initialized');
        
        // Initialize Notification Service
        await NotificationService().initialize();
        print('✅ Notification Service initialized');
      } catch (e) {
        print('⚠️ Firebase/Notification initialization failed (safe to ignore in dev): $e');
      }
    } else {
      print('🌐 Running on web - Firebase/Notifications not supported');
    }
    
    // Initialize Supabase with session persistence
    await Supabase.initialize(
      url: 'https://lhwtfjgtripwikxwookp.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxod3Rmamd0cmlwd2lreHdvb2twIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDU0NDYsImV4cCI6MjA4MDE4MTQ0Nn0.irdLKmMu1d_-Uiyv4zNEaH4rUwL8KCZ8FHhf30MABlU',
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
      ),
    );

    // Sync FCM Token if logged in (mobile only)
    if (!kIsWeb) {
      final authSession = Supabase.instance.client.auth.currentSession;
      if (authSession != null) {
        final token = authSession.accessToken;
        final fcmToken = NotificationService().fcmToken;
        if (fcmToken != null) {
          print('🔄 Syncing FCM token on startup...');
          final api = ApiService();
          api.setToken(token);
          await api.updateFcmToken(fcmToken);
        }
      }
    }
    
    // Global Flutter Error Handler
    FlutterError.onError = (FlutterErrorDetails details) {
      FlutterError.presentError(details);
      print('🔴 Flutter Error: ${details.exception}');
      print('Stack trace: ${details.stack}');
    };

    runApp(const TwinMindApp());
  }, (error, stack) {
    // Global Async Error Handler
    print('🔴 Global Async Error: $error');
    print('Stack trace: $stack');
    // TODO: Send to Crashlytics in future
  });
}

class TwinMindApp extends StatelessWidget {
  const TwinMindApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()),
      ],
      child: MaterialApp(
        title: 'TwinMind',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          brightness: Brightness.dark,
          scaffoldBackgroundColor: const Color(0xFF0F0F1E),
          textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF9333EA),
            secondary: Color(0xFF3B82F6),
            surface: Color(0xFF1A1A2E),
            background: Color(0xFF0F0F1E),
          ),
        ),
        home: const WelcomeScreen(),
        routes: {
          '/welcome': (context) => const WelcomeScreen(),
          '/login': (context) => const LoginScreen(),
          '/onboarding': (context) => const OnboardingScreen(),
          '/chat': (context) => const ChatScreen(),
          '/profile': (context) => const ProfileScreen(),
          '/settings': (context) => const SettingsScreen(),
          '/subscription': (context) => const SubscriptionScreen(),
          '/life-coach': (context) => const LifeCoachScreen(),
          '/notifications': (context) => const NotificationsScreen(),
          '/privacy': (context) => const PrivacyScreen(),
          '/home': (context) => const MainScreen(),
          '/daily-challenges': (context) => const DailyChallengesScreen(),
          '/achievements': (context) => const AchievementsScreen(),
          '/memory-timeline': (context) => const MemoryTimelineScreen(),
          '/terms': (context) => const TermsScreen(),
          '/insights': (context) => const InsightsScreen(),
          '/growth-story': (context) => const GrowthStoryScreen(),
          '/twin-match': (context) => const TwinMatchScreen(),
        },
      ),
    );
  }
}
