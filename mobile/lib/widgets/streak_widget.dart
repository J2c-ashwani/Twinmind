import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class StreakWidget extends StatefulWidget {
  const StreakWidget({super.key});

  @override
  State<StreakWidget> createState() => _StreakWidgetState();
}

class _StreakWidgetState extends State<StreakWidget> {
  Map<String, dynamic>? _streakData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadStreak();
  }

  Future<void> _loadStreak() async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final token = authService.getAccessToken();
      
      // Skip API call if not authenticated
      if (token == null) {
        setState(() {
          _isLoading = false;
        });
        return;
      }
      
      final api = ApiService();
      api.setToken(token);

      final data = await api.getGamificationStatus();
      final streaks = data['streaks'] as List;
      final dailyStreak = streaks.firstWhere(
        (s) => s['streak_type'] == 'daily_checkin',
        orElse: () => null,
      );

      setState(() {
        _streakData = dailyStreak;
        _isLoading = false;
      });
    } catch (e) {
      print('Failed to load streak: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  Color _getFlameColor(int streak) {
    if (streak == 0) return Colors.grey;
    if (streak >= 30) return Colors.purple;
    if (streak >= 7) return Colors.orange;
    return Colors.yellow;
  }

  String _getStatusText(String status) {
    switch (status) {
      case 'completed_today':
        return '✅ Completed Today';
      case 'at_risk':
        return '⚠️ Check in to keep streak!';
      case 'broken':
        return '💔 Streak broken - start fresh!';
      default:
        return '🔥 Keep it going!';
    }
  }

  Color _getBackgroundColor(String status) {
    switch (status) {
      case 'completed_today':
        return Colors.green.withOpacity(0.1);
      case 'at_risk':
        return Colors.yellow.withOpacity(0.1);
      case 'broken':
        return Colors.grey.withOpacity(0.1);
      default:
        return Colors.orange.withOpacity(0.1);
    }
  }

  Color _getBorderColor(String status) {
    switch (status) {
      case 'completed_today':
        return Colors.green.withOpacity(0.3);
      case 'at_risk':
        return Colors.yellow.withOpacity(0.3);
      case 'broken':
        return Colors.grey.withOpacity(0.2);
      default:
        return Colors.orange.withOpacity(0.3);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.grey.withOpacity(0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_streakData == null) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.grey.withOpacity(0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.local_fire_department, color: Colors.grey, size: 28),
                SizedBox(width: 12),
                Text(
                  'Daily Streak',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white70,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Text(
              'Start Today!',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Check in daily to build your streak',
              style: TextStyle(
                fontSize: 12,
                color: Colors.white.withOpacity(0.4),
              ),
            ),
          ],
        ),
      );
    }

    final effectiveStreak = _streakData!['effective_streak'] ?? 0;
    final longestStreak = _streakData!['longest_streak'] ?? 0;
    final status = _streakData!['status'] ?? 'active';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: _getBackgroundColor(status),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _getBorderColor(status)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.local_fire_department,
                    color: _getFlameColor(effectiveStreak),
                    size: 32,
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Daily Streak',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.white70,
                        ),
                      ),
                      Text(
                        '$effectiveStreak ${effectiveStreak == 1 ? 'day' : 'days'}',
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              if (longestStreak > 0)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.trending_up,
                          size: 12,
                          color: Colors.white.withOpacity(0.5),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Best',
                          style: TextStyle(
                            fontSize: 10,
                            color: Colors.white.withOpacity(0.5),
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '$longestStreak',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.white.withOpacity(0.8),
                      ),
                    ),
                  ],
                ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            _getStatusText(status),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: status == 'completed_today'
                  ? Colors.green
                  : status == 'at_risk'
                      ? Colors.yellow
                      : status == 'broken'
                          ? Colors.grey
                          : Colors.orange,
            ),
          ),
          const SizedBox(height: 16),

          // Freeze Token Indicator
          if (_streakData != null && _streakData!['freeze_tokens'] != null)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.purple.withOpacity(0.2)),
              ),
              child: Row(
                children: [
                  const Text('🛡️', style: TextStyle(fontSize: 20)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Streak Freeze',
                          style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.5)),
                        ),
                        Text(
                          '${_streakData!['freeze_tokens']} ${_streakData!['freeze_tokens'] == 1 ? 'token' : 'tokens'}',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                  if (_streakData!['freeze_tokens'] == 0)
                    TextButton(
                      onPressed: () {
                        _showPurchaseDialog();
                      },
                      style: TextButton.styleFrom(
                        backgroundColor: Colors.purple.withOpacity(0.2),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      ),
                      child: const Text('Get More', style: TextStyle(fontSize: 11)),
                    ),
                ],
              ),
            ),

          if (_streakData != null && _streakData!['freeze_tokens'] != null && _streakData!['freeze_tokens'] > 0)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Auto-saves your streak if you miss a day',
                style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.3)),
              ),
            ),

          const SizedBox(height: 16),

          // Progress bar for next milestone
          if (effectiveStreak > 0 && effectiveStreak < 30) ...[
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Next milestone',
                  style: TextStyle(
                    fontSize: 10,
                    color: Colors.white.withOpacity(0.4),
                  ),
                ),
                Text(
                  effectiveStreak < 7 ? '7 days' : '30 days',
                  style: TextStyle(
                    fontSize: 10,
                    color: Colors.white.withOpacity(0.4),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: LinearProgressIndicator(
                value: effectiveStreak / (effectiveStreak < 7 ? 7 : 30),
                backgroundColor: Colors.white.withOpacity(0.1),
                valueColor: const AlwaysStoppedAnimation<Color>(
                  Colors.orange,
                ),
                minHeight: 6,
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _showPurchaseDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A2E),
        title: const Text('Protect Your Streak! 🔥', style: TextStyle(color: Colors.white)),
        content: const Text(
          'Get Streak Freeze tokens with TwinGenie Pro. Never lose your progress again.',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pushNamed(context, '/subscription');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF9333EA),
            ),
            child: const Text('Upgrade now', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
