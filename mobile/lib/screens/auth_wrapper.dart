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
      bool success = false;
      int attempts = 0;
      
      while (!success && attempts < 3) {
        try {
          // Strict Check: Verify if personality exists
          final api = ApiService();
          await api.getPersonalityProfile();
          success = true; // If we get here, it exists (200 OK)
          
          if (mounted) {
            setState(() {
              _hasPersonality = true;
              _isLoading = false;
            });
          }
        } on HttpException catch (e) {
          if (e.statusCode == 404) {
            print('🔒 Strict Mode: Personality not found (404), redirecting to onboarding.');
            success = true; // Exit loop, we know the status
            if (mounted) {
              setState(() {
                _hasPersonality = false;
                _isLoading = false;
              });
            }
          } else {
            // Server error (500, 503, etc.) - Retry
            attempts++;
            print('⚠️ Server Check Attempt $attempts failed: ${e.statusCode}. Retrying...');
            await Future.delayed(const Duration(seconds: 2));
          }
        } catch (e) {
          // Network/Timeout error - Retry
          attempts++;
          print('⚠️ Network Check Attempt $attempts failed: $e. Retrying...');
          await Future.delayed(const Duration(seconds: 2));
        }
      }

      // If we exhausted retries and still failed
      if (!success && mounted) {
        // Fallback: Assume authenticated (MainScreen) to avoid locking user out.
        // The MainScreen will likely show error states for specific widgets.
        print('❌ All attempts failed. Creating optimistic session.');
        setState(() {
          _hasPersonality = true; 
          _isLoading = false;
        });
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
      return Scaffold(
        backgroundColor: const Color(0xFF0F0F1E),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // App icon with glow
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF9333EA), Color(0xFFEC4899)],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF9333EA).withOpacity(0.4),
                      blurRadius: 30,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.psychology,
                  color: Colors.white,
                  size: 40,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'TwinGenie',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Waking up your twin...',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.5),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 32),
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  color: Color(0xFF9333EA),
                  strokeWidth: 2.5,
                ),
              ),
            ],
          ),
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
