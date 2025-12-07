import 'package:flutter/material.dart';
import 'chat_screen.dart';
import 'explore_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({Key? key}) : super(key: key);

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;
  
  final List<Widget> _screens = [
    const ChatScreen(),
    const ExploreScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    // We use a Scaffold for the BottomNavigationBar
    // The body contains the individual screens which might have their own Scaffolds.
    // This creates a nested Scaffold structure which is valid for this use case.
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(
              color: Colors.white.withOpacity(0.1),
              width: 0.5,
            ),
          ),
        ),
        child: NavigationBarTheme(
          data: NavigationBarThemeData(
            labelTextStyle: MaterialStateProperty.all(
              const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
            ),
          ),
          child: NavigationBar(
            selectedIndex: _currentIndex,
            onDestinationSelected: (index) {
              setState(() {
                _currentIndex = index;
              });
            },
            backgroundColor: const Color(0xFF0F0F1E),
            indicatorColor: const Color(0xFF9333EA).withOpacity(0.2),
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.chat_bubble_outline),
                selectedIcon: Icon(Icons.chat_bubble),
                label: 'Chat',
              ),
              NavigationDestination(
                icon: Icon(Icons.explore_outlined),
                selectedIcon: Icon(Icons.explore),
                label: 'Explore',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
