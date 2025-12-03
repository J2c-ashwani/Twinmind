import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

class GrowthCircleWidget extends StatefulWidget {
  final VoidCallback? onInviteClick;
  
  const GrowthCircleWidget({Key? key, this.onInviteClick}) : super(key: key);

  @override
  State<GrowthCircleWidget> createState() => _GrowthCircleWidgetState();
}

class _GrowthCircleWidgetState extends State<GrowthCircleWidget> {
  Map<String, dynamic>? _circle;
  Map<String, dynamic>? _progress;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadCircle();
  }

  Future<void> _loadCircle() async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final api = ApiService();
      api.setToken(authService.getAccessToken() ?? 'dev-token');

      final data = await api.getMyCircle();
      if (data['circle'] != null) {
        final progress = await api.getCircleProgress(data['circle']['id']);
        setState(() {
          _circle = data['circle'];
          _progress = progress;
          _isLoading = false;
        });
      } else {
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      print('Failed to load circle: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  int _getNextMilestone() {
    if (_progress == null) return 10;
    final streak = _progress!['collective_streak'] ?? 0;
    if (streak < 10) return 10;
    if (streak < 30) return 30;
    return 90;
  }

  double _getMilestoneProgress() {
    if (_progress == null) return 0;
    final streak = _progress!['collective_streak'] ?? 0;
    final next = _getNextMilestone();
    return(streak / next).clamp(0.0, 1.0);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Colors.purple.withOpacity(0.1), Colors.blue.withOpacity(0.1)],
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.purple.withOpacity(0.2)),
        ),
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_circle == null) {
      return GestureDetector(
        onTap: widget.onInviteClick,
        child: Container(
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
              Row(
                children: [
                  Icon(Icons.people, color: Colors.purple[300], size: 24),
                  const SizedBox(width: 12),
                  Text(
                    'Growth Circle',
                    style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 14),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Text(
                'Create Your Circle',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 8),
              Text(
                'Invite friends to grow together and unlock exclusive features',
                style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.4)),
              ),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF9333EA), Color(0xFF3B82F6)],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: ElevatedButton(
                  onPressed: widget.onInviteClick,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text(
                    'Get Started',
                    style: TextStyle(fontWeight: FontWeight.w600, color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    final memberCount = _circle!['member_count'] ?? 0;
    final collectiveStreak = _progress?['collective_streak'] ?? 0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.purple.withOpacity(0.1), Colors.blue.withOpacity(0.1)],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.purple.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.people, color: Colors.purple[300], size: 28),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Growth Circle',
                        style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
                      ),
                      Text(
                        _circle!['name'] ?? 'My Circle',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ],
                  ),
                ],
              ),
              Row(
                children: [
                  Icon(Icons.people_outline, size: 12, color: Colors.white.withOpacity(0.5)),
                  const SizedBox(width: 4),
                  Text(
                    '$memberCount/5',
                    style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.5)),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Collective Streak
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.local_fire_department, color: Colors.orange, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Collective Streak',
                        style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.5)),
                      ),
                      Text(
                        '$collectiveStreak days',
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Progress to Next Milestone
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Next milestone',
                style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.4)),
              ),
              Text(
                '${_getNextMilestone()} days',
                style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.4)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: _getMilestoneProgress(),
              backgroundColor: Colors.white.withOpacity(0.1),
              valueColor: AlwaysStoppedAnimation<Color>(Colors.purple[400]!),
              minHeight: 6,
            ),
          ),
          const SizedBox(height: 16),

          // Invite Button or Full Badge
          if (memberCount < 5)
            ElevatedButton(
              onPressed: widget.onInviteClick,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.purple.withOpacity(0.2),
                side: BorderSide(color: Colors.purple.withOpacity(0.3)),
                minimumSize: const Size(double.infinity, 45),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.person_add, size: 18),
                  const SizedBox(width: 8),
                  Text('Invite Friends (${5 - memberCount} spots left)'),
                ],
              ),
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.2),
                border: Border.all(color: Colors.green.withOpacity(0.3)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(
                child: Text(
                  '🎉 Circle is Full!',
                  style: TextStyle(color: Colors.green, fontWeight: FontWeight.w600),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
