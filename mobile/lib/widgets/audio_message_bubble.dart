import 'package:flutter/material.dart';
import 'package:flutter_sound/flutter_sound.dart';
import 'dart:async';

class AudioMessageBubble extends StatefulWidget {
  final String audioUrl;
  final bool isUser;

  const AudioMessageBubble({
    super.key,
    required this.audioUrl,
    required this.isUser,
  });

  @override
  State<AudioMessageBubble> createState() => _AudioMessageBubbleState();
}

class _AudioMessageBubbleState extends State<AudioMessageBubble> {
  final FlutterSoundPlayer _player = FlutterSoundPlayer();
  bool _isPlaying = false;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _initPlayer();
  }

  Future<void> _initPlayer() async {
    await _player.openPlayer();
    setState(() {
      _isInitialized = true;
    });
  }

  @override
  void dispose() {
    _player.closePlayer();
    super.dispose();
  }

  Future<void> _togglePlayback() async {
    if (!_isInitialized) return;

    if (_isPlaying) {
      await _player.stopPlayer();
      setState(() => _isPlaying = false);
    } else {
      setState(() => _isPlaying = true);
      try {
        await _player.startPlayer(
          fromURI: widget.audioUrl,
          whenFinished: () {
            if (mounted) {
              setState(() => _isPlaying = false);
            }
          },
        );
      } catch (e) {
        print('Error playing audio: $e');
        setState(() => _isPlaying = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: widget.isUser 
            ? Colors.white.withOpacity(0.2) 
            : Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: widget.isUser 
              ? Colors.white.withOpacity(0.3) 
              : Colors.grey[300]!,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          GestureDetector(
            onTap: _togglePlayback,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: widget.isUser ? Colors.white : const Color(0xFF8B5CF6),
                shape: BoxShape.circle,
              ),
              child: Icon(
                _isPlaying ? Icons.stop_rounded : Icons.play_arrow_rounded,
                color: widget.isUser ? const Color(0xFF8B5CF6) : Colors.white,
                size: 24,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Voice Message',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: widget.isUser ? Colors.white : Colors.black87,
                ),
              ),
              Text(
                _isPlaying ? 'Playing...' : 'Tap to play',
                style: TextStyle(
                  fontSize: 12,
                  color: widget.isUser ? Colors.white70 : Colors.grey[600],
                ),
              ),
            ],
          ),
          const SizedBox(width: 16),
        ],
      ),
    );
  }
}
