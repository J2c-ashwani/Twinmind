import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class GrowthCirclesScreen extends StatefulWidget {
  const GrowthCirclesScreen({super.key});

  @override
  State<GrowthCirclesScreen> createState() => _GrowthCirclesScreenState();
}

class _GrowthCirclesScreenState extends State<GrowthCirclesScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _myCircle;
  Map<String, dynamic>? _progress;
  String? _error;
  final _joinController = TextEditingController();
  final _createController = TextEditingController();

  final ApiService _apiService = ApiService();

  @override
  void initState() {
    super.initState();
    _loadCircleData();
  }

  Future<void> _loadCircleData() async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final token = authService.getAccessToken();
      if (token == null) return;
      _apiService.setToken(token);

      final circleData = await _apiService.getMyCircle();
      
      if (circleData['circle'] != null) {
        _myCircle = circleData['circle'];
        // Load progress if user has a circle
        try {
          final progressData = await _apiService.getCircleProgress(_myCircle!['id']);
          _progress = progressData;
        } catch (e) {
          print('Error loading progress: $e');
        }
      }

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _createCircle() async {
    final name = _createController.text.trim();
    if (name.isEmpty) return;

    setState(() => _isLoading = true);
    try {
      await _apiService.createCircle(name: name);
      _createController.clear();
      await _loadCircleData();
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _joinCircle() async {
    final code = _joinController.text.trim();
    if (code.isEmpty) return;

    setState(() => _isLoading = true);
    try {
      await _apiService.joinCircle(code);
      _joinController.clear();
      await _loadCircleData();
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _leaveCircle() async {
    if (_myCircle == null) return;
    
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Leave Circle?'),
        content: const Text('You will lose your progress contribution.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Leave', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
      await _apiService.leaveCircle(_myCircle!['id']);
      setState(() {
        _myCircle = null;
        _progress = null;
      });
      await _loadCircleData();
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Growth Circle'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          if (_myCircle != null)
            IconButton(
              icon: const Icon(Icons.exit_to_app, color: Colors.redAccent),
              onPressed: _leaveCircle,
              tooltip: 'Leave Circle',
            ),
        ],
      ),
      extendBodyBehindAppBar: true,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0F0F1E), Color(0xFF1A0B2E), Color(0xFF0F0F1E)],
          ),
        ),
        child: SafeArea(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _myCircle != null
                  ? _buildCircleDashboard()
                  : _buildOnboarding(),
        ),
      ),
    );
  }

  Widget _buildCircleDashboard() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Card
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF8B5CF6), Color(0xFFEC4899)],
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF8B5CF6).withOpacity(0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              children: [
                const Icon(Icons.people_alt_rounded, size: 48, color: Colors.white),
                const SizedBox(height: 16),
                Text(
                  _myCircle!['name'],
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Collective Streak: ${_myCircle!['collective_streak']} days',
                  style: const TextStyle(
                    fontSize: 16,
                    color: Colors.white70,
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          
          // Stats Grid
          if (_progress != null)
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            children: [
               _buildStatCard('Members', '${_progress!['members_count']}', Icons.person),
               _buildStatCard('Total XP', '${_progress!['total_xp']}', Icons.star),
               _buildStatCard('Goals Met', '${_progress!['goals_completed']}', Icons.check_circle),
               // Invite Button functionality would go here
               _buildInviteCard(),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInviteCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: InkWell(
        onTap: () {
           // Create invite link logic would go here
           ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invite feature coming soon')));
        },
        borderRadius: BorderRadius.circular(20),
        child: const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
             Icon(Icons.person_add, size: 32, color: Colors.greenAccent),
             SizedBox(height: 8),
             Text('Invite', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 32, color: Colors.white70),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withOpacity(0.6),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOnboarding() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.groups_rounded, size: 80, color: Colors.white54),
          const SizedBox(height: 24),
          const Text(
            'Join a Growth Circle',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Grow faster with friends. Share goals, compete on streaks, and keep each other accountable.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              color: Colors.white.withOpacity(0.6),
            ),
          ),
          const SizedBox(height: 48),

          // Join Input
          TextField(
            controller: _joinController,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              labelText: 'Enter Invite Code',
              labelStyle: TextStyle(color: Colors.white.withOpacity(0.6)),
              enabledBorder: OutlineInputBorder(
                borderSide: BorderSide(color: Colors.white.withOpacity(0.3)),
                borderRadius: BorderRadius.circular(12),
              ),
              focusedBorder: OutlineInputBorder(
                borderSide: const BorderSide(color: Color(0xFF8B5CF6)),
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _joinCircle,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF8B5CF6),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Join Circle'),
            ),
          ),
          
          const SizedBox(height: 32),
          Row(
            children: [
              Expanded(child: Divider(color: Colors.white.withOpacity(0.2))),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text('OR', style: TextStyle(color: Colors.white.withOpacity(0.4))),
              ),
              Expanded(child: Divider(color: Colors.white.withOpacity(0.2))),
            ],
          ),
          const SizedBox(height: 32),

          // Create Input
          TextField(
            controller: _createController,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              labelText: 'Create a New Circle',
              hintText: 'e.g. "Morning Risers"',
              hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
              labelStyle: TextStyle(color: Colors.white.withOpacity(0.6)),
              enabledBorder: OutlineInputBorder(
                borderSide: BorderSide(color: Colors.white.withOpacity(0.3)),
                borderRadius: BorderRadius.circular(12),
              ),
              focusedBorder: OutlineInputBorder(
                borderSide: const BorderSide(color: Color(0xFFEC4899)),
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _createCircle,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEC4899),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Create Circle'),
            ),
          ),

          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 24),
              child: Text(
                _error!,
                style: const TextStyle(color: Colors.redAccent),
              ),
            ),
        ],
      ),
    );
  }
}
