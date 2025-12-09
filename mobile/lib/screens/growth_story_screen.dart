import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

class GrowthStoryScreen extends StatefulWidget {
  const GrowthStoryScreen({super.key});

  @override
  State<GrowthStoryScreen> createState() => _GrowthStoryScreenState();
}

class _GrowthStoryScreenState extends State<GrowthStoryScreen> {
  Map<String, dynamic>? _yearData;
  Map<String, dynamic>? _insights;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final api = ApiService();
      api.setToken(authService.getAccessToken() ?? 'dev-token');

      final yearData = await api.getYearCalendar();
      final insights = await api.getGrowthInsights('year');

      setState(() {
        _yearData = yearData;
        _insights = insights;
        _isLoading = false;
      });
    } catch (e) {
      print('Failed to load growth story: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  Color _getMoodColor(int? mood) {
    if (mood == null) return Colors.grey.withOpacity(0.3);
    switch (mood) {
      case 1:
        return Colors.red;
      case 2:
        return Colors.orange;
      case 3:
        return Colors.yellow;
      case 4:
        return Colors.green;
      case 5:
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Your Growth Story'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Year in Pixels
                  _buildYearInPixels(),
                  const SizedBox(height: 24),

                  // AI Insights
                  if (_insights != null) _buildInsights(),
                ],
              ),
            ),
    );
  }

  Widget _buildYearInPixels() {
    if (_yearData == null || _yearData!['days'] == null) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Colors.blue.withOpacity(0.1), Colors.purple.withOpacity(0.1)],
          ),
          borderRadius: BorderRadius.circular(20),
        ),
        child: const Text('No mood data yet. Start tracking!', style: TextStyle(color: Colors.white70)),
      );
    }

    final days = _yearData!['days'] as List;
    final year = _yearData!['year'];
    final totalDays = _yearData!['totalDays'] ?? 0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue.withOpacity(0.1), Colors.purple.withOpacity(0.1)],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.blue.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$year in Pixels',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  Text(
                    '$totalDays days tracked',
                    style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.5)),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Mood Grid
          Wrap(
            spacing: 2,
            runSpacing: 2,
            children: days.map<Widget>((day) {
              final mood = day['mood'] as int?;
              return Container(
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  color: _getMoodColor(mood),
                  borderRadius: BorderRadius.circular(1),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 16),

          // Legend
          Row(
            children: [
              Text('Less', style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.5))),
              const SizedBox(width: 8),
              ...List.generate(
                5,
                (i) => Container(
                  width: 12,
                  height: 12,
                  margin: const EdgeInsets.only(right: 4),
                  decoration: BoxDecoration(
                    color: _getMoodColor(i + 1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text('More', style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.5))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInsights() {
    final insights = _insights!['insights'] as List?;
    if (insights == null || insights.isEmpty) return const SizedBox();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.purple.withOpacity(0.1), Colors.blue.withOpacity(0.1)],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.purple.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.auto_awesome, color: Colors.purpleAccent, size: 24),
              SizedBox(width: 12),
              Text(
                'AI Insights',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Stats
          Row(
            children: [
              Expanded(
                child: _buildStatCard('Check-ins', '${_insights!['totalCheckIns']}'),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard('Avg Mood', '${(_insights!['averageMood'] as num).toStringAsFixed(1)}/5'),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Insights
          ...insights.asMap().entries.map((entry) {
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
                border: const Border(left: BorderSide(color: Colors.purpleAccent, width: 2)),
              ),
              child: Text(
                entry.value,
                style: const TextStyle(fontSize: 14, color: Colors.white, height: 1.5),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.5))),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
        ],
      ),
    );
  }
}
