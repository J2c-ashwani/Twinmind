import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

class WeeklyMotivationCardWidget extends StatefulWidget {
  const WeeklyMotivationCardWidget({super.key});

  @override
  State<WeeklyMotivationCardWidget> createState() => _WeeklyMotivationCardWidgetState();
}

class _WeeklyMotivationCardWidgetState extends State<WeeklyMotivationCardWidget> {
  Map<String, dynamic>? _card;
  bool _isLoading = true;
  bool _isGenerating = false;

  @override
  void initState() {
    super.initState();
    _loadCard();
  }

  Future<void> _loadCard() async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final api = ApiService();
      api.setToken(authService.getAccessToken() ?? 'dev-token');

      final data = await api.getWeeklyMotivationCard();
      setState(() {
        _card = data['card'];
        _isLoading = false;
      });
    } catch (e) {
      print('Failed to load card: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _generateCard() async {
    setState(() {
      _isGenerating = true;
    });

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final api = ApiService();
      api.setToken(authService.getAccessToken() ?? 'dev-token');

      final data = await api.generateMotivationCard();
      setState(() {
        _card = data['card'];
        _isGenerating = false;
      });
    } catch (e) {
      print('Failed to generate card: $e');
      setState(() {
        _isGenerating = false;
      });
    }
  }

  Future<void> _shareCard() async {
    if (_card == null) return;

    try {
      await Share.share(
        '"${_card!['quote']}" - ${_card!['twin_name']}\n\nGet your own AI companion at TwinMind',
        subject: 'My Weekly Motivation',
      );

      // Mark as shared
      final authService = Provider.of<AuthService>(context, listen: false);
      final api = ApiService();
      api.setToken(authService.getAccessToken() ?? 'dev-token');
      await api.markCardShared(_card!['id'], 'native');
    } catch (e) {
      print('Share failed: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Colors.purple.withOpacity(0.1), Colors.pink.withOpacity(0.1)],
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.purple.withOpacity(0.2)),
        ),
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_card == null) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Colors.purple.withOpacity(0.1), Colors.pink.withOpacity(0.1)],
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.purple.withOpacity(0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.auto_awesome, color: Colors.purpleAccent, size: 24),
                const SizedBox(width: 12),
                Text(
                  'Weekly Motivation',
                  style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 14),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              'Chat more this week to unlock your personalized motivation card!',
              style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 14),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _isGenerating ? null : _generateCard,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF9333EA),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 45),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(_isGenerating ? 'Generating...' : 'Try to Generate Now'),
            ),
          ],
        ),
      );
    }

    final weekStart = DateTime.parse(_card!['week_start']).toLocal();
    final weekEnd = DateTime.parse(_card!['week_end']).toLocal();

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.purple.withOpacity(0.2),
            Colors.pink.withOpacity(0.2),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.purple.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              const Icon(Icons.auto_awesome, color: Colors.purpleAccent, size: 28),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Weekly Motivation',
                      style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.5)),
                    ),
                    Text(
                      '${_formatDate(weekStart)} - ${_formatDate(weekEnd)}',
                      style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.7)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Quote
          Text(
            '"${_card!['quote']}"',
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: Colors.white,
              fontStyle: FontStyle.italic,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerRight,
            child: Text(
              '— ${_card!['twin_name']}',
              style: TextStyle(fontSize: 14, color: Colors.white.withOpacity(0.6)),
            ),
          ),
          const SizedBox(height: 20),

          // Actions
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _shareCard,
                  icon: const Icon(Icons.share, size: 18),
                  label: const Text('Share'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white.withOpacity(0.1),
                    foregroundColor: Colors.white,
                    side: BorderSide(color: Colors.white.withOpacity(0.2)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              ElevatedButton.icon(
                onPressed: _isGenerating ? null : _generateCard,
                icon: const Icon(Icons.refresh, size: 18),
                label: Text(_isGenerating ? '...' : 'Regenerate'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white.withOpacity(0.1),
                  foregroundColor: Colors.white,
                  side: BorderSide(color: Colors.white.withOpacity(0.2)),
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${months[date.month - 1]} ${date.day}';
  }
}
