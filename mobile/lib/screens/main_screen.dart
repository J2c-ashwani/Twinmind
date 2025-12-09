import 'package:flutter/material.dart';
import 'chat_screen.dart';
import 'explore_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  final int _currentIndex = 0;
  
  final List<Widget> _screens = [
    const ChatScreen(),
    const ExploreScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    // We use a Scaffold for the BottomNavigationBar
    // The body contains the individual screens which might have their own Scaffolds.
    // This creates a nested Scaffold structure which is valid for this use case.
    return const Scaffold(
      body: ChatScreen(),
    );
  }
}
