import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import 'welcome_screen.dart';
import 'main_screen.dart';

import '../services/api_service.dart';
import 'onboarding_screen.dart';

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  bool _isLoading = true;
  bool _hasPersonality = false;

  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    await Future.delayed(const Duration(milliseconds: 500));
    
    final authService = Provider.of<AuthService>(context, listen: false);
    
    if (authService.isAuthenticated) {
      try {
        // Strict Check: Verify if personality exists
        final api = ApiService();
        await api.getPersonalityProfile();
        
        if (mounted) {
          setState(() {
            _hasPersonality = true;
            _isLoading = false;
          });
        }
      } catch (e) {
        // If 404/Error, assume pending onboarding
        print('🔒 Strict Mode: Personality not found, redirecting to onboarding.');
        if (mounted) {
          setState(() {
            _hasPersonality = false;
            _isLoading = false;
          });
        }
      }
    } else {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFF0F0F1E),
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFF9333EA)),
        ),
      );
    }

    return Consumer<AuthService>(
      builder: (context, authService, _) {
        if (!authService.isAuthenticated) {
          return const WelcomeScreen();
        }

        // Strict Routing:
        if (_hasPersonality) {
          return const MainScreen();
        } else {
          // User is logged in but missing profile -> Force Onboarding
          return const OnboardingScreen();
        }
      },
    );
  }
}
