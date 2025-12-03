import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'screens/welcome_screen.dart';
import 'screens/chat_screen.dart';
import 'screens/login_screen.dart';
import 'screens/onboarding_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/subscription_screen.dart';
import 'services/auth_service.dart';

Future<void> main() async {
  print('TwinMind App Starting...');
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Supabase with session persistence
  await Supabase.initialize(
    url: 'https://lhwtfjgtripwikxwookp.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxod3Rmamd0cmlwd2lreHdvb2twIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDU0NDYsImV4cCI6MjA4MDE4MTQ0Nn0.irdLKmMu1d_-Uiyv4zNEaH4rUwL8KCZ8FHhf30MABlU',
    authOptions: const FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,  // More secure
      // Session persists in localStorage (web) or SharedPreferences (mobile)
    ),
  );
  
  runApp(const TwinMindApp());
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
        },
      ),
    );
  }
}
