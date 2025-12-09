import 'package:flutter/material.dart';
import '../services/api_service.dart';

class CoachingSessionScreen extends StatefulWidget {
  final String programId;
  final String programTitle;

  const CoachingSessionScreen({
    super.key,
    required this.programId,
    required this.programTitle,
  });

  @override
  State<CoachingSessionScreen> createState() => _CoachingSessionScreenState();
}

class _CoachingSessionScreenState extends State<CoachingSessionScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  
  bool _isLoading = true;
  bool _isSending = false;
  Map<String, dynamic>? _sessionData;
  final List<Map<String, String>> _messages = []; // {role: 'user'|'ai', content: '...'}
  bool _showExercise = false;

  @override
  void initState() {
    super.initState();
    _loadSession();
  }

  Future<void> _loadSession() async {
    try {
      final session = await _apiService.getSession(widget.programId);
      setState(() {
        _sessionData = session;
        _isLoading = false;
        
        // Add initial prompt from AI if history is empty
        if (_messages.isEmpty) {
          _messages.add({
            'role': 'ai',
            'content': session['content']['initial_prompt']
          });
        }
      });
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load session: $e')),
      );
    }
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty) return;

    final userMsg = _messageController.text.trim();
    setState(() {
      _messages.add({'role': 'user', 'content': userMsg});
      _messageController.clear();
      _isSending = true;
    });
    _scrollToBottom();

    try {
      final response = await _apiService.sendSessionMessage(
        widget.programId,
        userMsg,
        _messages,
      );

      setState(() {
        _messages.add({'role': 'ai', 'content': response['response']});
        _isSending = false;
      });
      _scrollToBottom();
    } catch (e) {
      setState(() => _isSending = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to send message: $e')),
      );
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _completeSession() async {
    // Show dialog to enter notes
    final notesController = TextEditingController();
    
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Complete Session'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Great job! Any notes for today?'),
            const SizedBox(height: 16),
            TextField(
              controller: notesController,
              decoration: const InputDecoration(
                hintText: 'What did you learn?',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              try {
                await _apiService.completeSession(widget.programId, notesController.text);
                if (!mounted) return;
                Navigator.pop(context); // Go back to program list
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Session completed! 🎉')),
                );
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Error: $e')),
                );
              }
            },
            child: const Text('Complete'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final dayContent = _sessionData?['content'];
    final progress = _sessionData?['progress'];

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.programTitle, style: const TextStyle(fontSize: 16)),
            Text(
              'Day ${progress['current_day']}: ${dayContent['title']}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w400),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.assignment),
            onPressed: () {
              setState(() => _showExercise = !_showExercise);
            },
          ),
          IconButton(
            icon: const Icon(Icons.check_circle_outline),
            onPressed: _completeSession,
          ),
        ],
      ),
      body: Column(
        children: [
          // Goal Banner
          Container(
            padding: const EdgeInsets.all(12),
            color: Colors.blue.withOpacity(0.1),
            child: Row(
              children: [
                const Icon(Icons.flag, color: Colors.blue),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Goal: ${dayContent['goal']}',
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          ),
          
          // Exercise Panel (Collapsible)
          if (_showExercise)
            Container(
              padding: const EdgeInsets.all(16),
              color: Colors.amber.withOpacity(0.1),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '📝 Today\'s Exercise',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 8),
                  Text(dayContent['exercise_instructions']),
                ],
              ),
            ),

          // Chat Area
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isUser = msg['role'] == 'user';
                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.8,
                    ),
                    decoration: BoxDecoration(
                      color: isUser ? Colors.blueAccent : Colors.grey[200],
                      borderRadius: BorderRadius.circular(16).copyWith(
                        bottomRight: isUser ? Radius.zero : null,
                        bottomLeft: !isUser ? Radius.zero : null,
                      ),
                    ),
                    child: Text(
                      msg['content']!,
                      style: TextStyle(
                        color: isUser ? Colors.white : Colors.black87,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // Input Area
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -5),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: const InputDecoration(
                      hintText: 'Type your response...',
                      border: InputBorder.none,
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                IconButton(
                  icon: _isSending
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.send, color: Colors.blueAccent),
                  onPressed: _isSending ? null : _sendMessage,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
