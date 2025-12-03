import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class MoodHistoryWidget extends StatefulWidget {
  const MoodHistoryWidget({Key? key}) : super(key: key);

  @override
  State<MoodHistoryWidget> createState() => _MoodHistoryWidgetState();
}

class _MoodHistoryWidgetState extends State<MoodHistoryWidget> {
  List<dynamic> _history = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final api = ApiService();
      api.setToken(authService.getAccessToken() ?? 'dev-token');

      final data = await api.getMoodHistory(days: 7);
      setState(() {
        _history = data.reversed.toList(); // Oldest to newest
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading mood history: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  Color _getMoodColor(int mood) {
    switch (mood) {
      case 1: return Colors.red;
      case 2: return Colors.orange;
      case 3: return Colors.amber;
      case 4: return Colors.lightGreen;
      case 5: return Colors.green;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Container(
        height: 150,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ShaderMask(
            shaderCallback: (bounds) => const LinearGradient(
              colors: [Color(0xFFC084FC), Color(0xFFF472B6)], // Purple to Pink
            ).createShader(bounds),
            child: const Text(
              'Mood History',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 100,
            child: _history.isEmpty
                ? const Center(
                    child: Text(
                      'No mood data yet',
                      style: TextStyle(color: Colors.grey),
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: _history.map((entry) {
                      final mood = entry['mood'] as int;
                      final height = (mood / 5) * 80.0; // Max height 80
                      
                      return Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Tooltip(
                            message: '${_formatDate(entry['created_at'])}\nMood: $mood/5\n${entry['note'] ?? ''}',
                            triggerMode: TooltipTriggerMode.tap,
                            child: Container(
                              width: 20,
                              height: height,
                              decoration: BoxDecoration(
                                color: _getMoodColor(mood),
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                                boxShadow: [
                                  BoxShadow(
                                    color: _getMoodColor(mood).withOpacity(0.5),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _getDayLabel(entry['created_at']),
                            style: const TextStyle(
                              color: Colors.white54,
                              fontSize: 10,
                            ),
                          ),
                        ],
                      );
                    }).toList(),
                  ),
          ),
        ],
      ),
    );
  }

  String _getDayLabel(String dateStr) {
    final date = DateTime.parse(dateStr);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days[date.weekday - 1];
  }

  String _formatDate(String dateStr) {
    final date = DateTime.parse(dateStr);
    return '${date.day}/${date.month}';
  }
}
