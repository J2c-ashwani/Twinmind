import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'coaching_session_screen.dart';

class ProgramDetailScreen extends StatefulWidget {
  final String programId;
  final String title;

  const ProgramDetailScreen({
    Key? key,
    required this.programId,
    required this.title,
  }) : super(key: key);

  @override
  State<ProgramDetailScreen> createState() => _ProgramDetailScreenState();
}

class _ProgramDetailScreenState extends State<ProgramDetailScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = false;

  Future<void> _startProgram() async {
    setState(() => _isLoading = true);
    try {
      await _apiService.startProgram(widget.programId);
      if (!mounted) return;
      
      // Navigate to session
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => CoachingSessionScreen(
            programId: widget.programId,
            programTitle: widget.title,
          ),
        ),
      );
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to start program: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      extendBodyBehindAppBar: true,
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.blue.shade900,
              Colors.purple.shade900,
            ],
          ),
        ),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.rocket_launch,
                  size: 80,
                  color: Colors.white,
                ),
                const SizedBox(height: 32),
                Text(
                  'Ready to start ${widget.title}?',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'This program is designed to help you grow. Commit to just 15 minutes a day.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.8),
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 48),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _startProgram,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blueAccent,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: _isLoading
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text(
                            'Start Day 1',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
