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
import 'services/auth_service.dart';
import 'services/api_service.dart';
import 'services/notification_service.dart';

import 'screens/auth_wrapper.dart';

import 'dart:async';

void main() {
  // Catch errors during strict startup
  runZonedGuarded(() {
    WidgetsFlutterBinding.ensureInitialized();
    runApp(const TwinMindApp());
  }, (error, stack) {
    print('🔴 Global Startup Error: $error');
  });
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  String _status = 'Initializing...';
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    try {
      setState(() => _status = 'Connecting to services...');
      
      // Initialize Firebase (skip on web)
      if (!kIsWeb) {
        try {
          await Firebase.initializeApp();
          await NotificationService().initialize();
        } catch (e) {
          print('⚠️ Firebase warning: $e');
        }
      }

      // Initialize Supabase
      setState(() => _status = 'Syncing data...');
      await Supabase.initialize(
        url: 'https://lhwtfjgtripwikxwookp.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxod3Rmamd0cmlwd2lreHdvb2twIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDU0NDYsImV4cCI6MjA4MDE4MTQ0Nn0.irdLKmMu1d_-Uiyv4zNEaH4rUwL8KCZ8FHhf30MABlU',
        authOptions: const FlutterAuthClientOptions(
          authFlowType: AuthFlowType.pkce,
        ),
      );

      // Sync FCM if needed
      if (!kIsWeb) {
        try {
          final session = Supabase.instance.client.auth.currentSession;
          if (session != null) {
            final fcmToken = NotificationService().fcmToken;
            if (fcmToken != null) {
              final api = ApiService();
              api.setToken(session.accessToken);
              await api.updateFcmToken(fcmToken);
            }
          }
        } catch (_) {}
      }

      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const AuthWrapper()),
        );
      }
    } catch (e) {
      print('🔴 Initialization Error: $e');
      setState(() {
        _status = 'Connection failed. Please check your internet.';
        _hasError = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0F1E),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Logo
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF9333EA), Color(0xFF3B82F6)],
                ),
                borderRadius: BorderRadius.circular(25),
              ),
              child: const Icon(Icons.psychology, size: 50, color: Colors.white),
            ),
            const SizedBox(height: 32),
            if (_hasError)
              Column(
                children: [
                   Text(
                    _status,
                    style: GoogleFonts.inter(color: Colors.redAccent),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      setState(() {
                        _hasError = false;
                        _status = 'Retrying...';
                      });
                      _initializeApp();
                    },
                    child: const Text('Retry'),
                  )
                ],
              )
            else ...[
              const CircularProgressIndicator(color: Color(0xFF9333EA)),
              const SizedBox(height: 16),
              Text(
                _status,
                style: GoogleFonts.inter(color: Colors.white54),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class TwinMindApp extends StatelessWidget {
  const TwinMindApp({super.key});

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
          ),
        ),
        home: const SplashScreen(),
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
