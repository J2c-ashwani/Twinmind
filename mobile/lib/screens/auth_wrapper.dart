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
  @override
  Widget build(BuildContext context) {
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
