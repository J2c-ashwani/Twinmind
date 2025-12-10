import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import 'welcome_screen.dart';
import 'main_screen.dart';

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    // Allow Supabase to restore session
    await Future.delayed(const Duration(milliseconds: 500));
    if (mounted) {
      setState(() {
        _isLoading = false;
      });
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

    // Listen to AuthService
    return Consumer<AuthService>(
      builder: (context, authService, _) {
        // If authenticated, go to MainScreen (which shows Chat)
        if (authService.isAuthenticated) {
          return const MainScreen();
        }
        // Otherwise show Welcome Screen
        return const WelcomeScreen();
      },
    );
  }
}
