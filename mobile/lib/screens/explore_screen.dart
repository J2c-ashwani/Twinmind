import 'package:flutter/material.dart';

class ExploreScreen extends StatelessWidget {
  const ExploreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent, // Handled by parent
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Explore',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Discover your growth tools',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.white.withOpacity(0.6),
                ),
              ),
              const SizedBox(height: 24),

              // Grid of Features
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                childAspectRatio: 0.9,
                children: [
                   _buildFeatureCard(
                    context,
                    'Achievements',
                    'Badges & XP',
                    Icons.emoji_events,
                    const Color(0xFFF59E0B),
                    '/achievements',
                  ),
                  _buildFeatureCard(
                    context,
                    'Challenges',
                    'Daily tasks',
                    Icons.flag,
                    const Color(0xFFEF4444),
                    '/daily-challenges',
                  ),
                   _buildFeatureCard(
                    context,
                    'Insights',
                    'Weekly stats',
                    Icons.insights,
                    const Color(0xFF8B5CF6),
                    '/insights',
                  ),
                  _buildFeatureCard(
                    context,
                    'Life Coach',
                    'Guidance',
                    Icons.self_improvement,
                    const Color(0xFF10B981),
                    '/life-coach',
                  ),
                  _buildFeatureCard(
                    context,
                    'Notifications',
                    'Updates',
                    Icons.notifications,
                    const Color(0xFF3B82F6),
                    '/notifications',
                  ),
                  _buildFeatureCard(
                    context,
                    'Twin Match',
                    'Community',
                    Icons.people,
                    const Color(0xFFEC4899),
                    '/twin-match', // Assuming this route exists or we can add it
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFeatureCard(
    BuildContext context,
    String title,
    String subtitle,
    IconData icon,
    Color color,
    String route,
  ) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => Navigator.pushNamed(context, route),
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.08),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 28),
              ),
              const SizedBox(height: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.white.withOpacity(0.5),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
