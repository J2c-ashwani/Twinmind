import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

class VoiceRecorderWidget extends StatefulWidget {
  final Function(File audioFile, int duration) onSend;
  final VoidCallback? onCancel;

  const VoiceRecorderWidget({
    super.key,
    required this.onSend,
    this.onCancel,
  });

  @override
  State<VoiceRecorderWidget> createState() => _VoiceRecorderWidgetState();
}

class _VoiceRecorderWidgetState extends State<VoiceRecorderWidget> {
  final AudioRecorder _recorder = AudioRecorder();
  bool _isRecording = false;
  bool _isPlaying = false;
  int _duration = 0;
  File? _audioFile;
  String? _recordingPath;

  @override
  void dispose() {
    _recorder.dispose();
    super.dispose();
  }

  Future<void> _startRecording() async {
    try {
      // Check and request permission
      if (await _recorder.hasPermission()) {
        // Get temp directory
        final directory = kIsWeb 
            ? null // Web doesn't need path_provider
            : await getTemporaryDirectory();
        
        _recordingPath = kIsWeb
            ? 'voice_recording' // Web uses blob
            : '${directory!.path}/voice_${DateTime.now().millisecondsSinceEpoch}.m4a';

        // Configure recording based on platform
        final config = RecordConfig(
          encoder: kIsWeb ? AudioEncoder.opus : AudioEncoder.aacLc,
          bitRate: 128000,
          sampleRate: 44100,
        );

        await _recorder.start(config, path: _recordingPath!);

        setState(() {
          _isRecording = true;
          _duration = 0;
        });

        // Update duration
        _startDurationTimer();
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Microphone permission denied')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to start recording: $e')),
        );
      }
    }
  }

  void _startDurationTimer() {
    Future.delayed(const Duration(seconds: 1), () {
      if (_isRecording && mounted) {
        setState(() {
          _duration++;
        });
        _startDurationTimer();
      }
    });
  }

  Future<void> _stopRecording() async {
    try {
      final path = await _recorder.stop();
      
      if (path != null) {
        if (kIsWeb) {
          // On web, we need to handle the blob URL differently
          // For now, we'll create a temporary file reference
          _audioFile = File(path);
        } else {
          _audioFile = File(path);
        }
      }

      setState(() {
        _isRecording = false;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to stop recording: $e')),
        );
      }
    }
  }

  void _handleSend() {
    if (_audioFile != null) {
      widget.onSend(_audioFile!, _duration);
      _reset();
    }
  }

  void _handleCancel() {
    _reset();
    widget.onCancel?.call();
  }

  void _reset() {
    setState(() {
      _isRecording = false;
      _isPlaying = false;
      _duration = 0;
      _audioFile = null;
      _recordingPath = null;
    });
  }

  String _formatDuration(int seconds) {
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    return '${mins.toString().padLeft(1, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: _buildContent(),
    );
  }

  Widget _buildContent() {
    if (!_isRecording && _audioFile == null) {
      return _buildStartButton();
    } else if (_isRecording) {
      return _buildRecordingUI();
    } else {
      return _buildPreviewUI();
    }
  }

  Widget _buildStartButton() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        GestureDetector(
          onTap: _startRecording,
          child: Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                colors: [Color(0xFFEF4444), Color(0xFFEC4899)],
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFEF4444).withOpacity(0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Icon(
              Icons.mic,
              color: Colors.white,
              size: 36,
            ),
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Tap to start recording',
          style: TextStyle(
            color: Colors.grey,
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  Widget _buildRecordingUI() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Waveform animation
        SizedBox(
          height: 80,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(20, (index) {
              return Container(
                width: 3,
                height: 20 + (index % 5) * 10,
                margin: const EdgeInsets.symmetric(horizontal: 2),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFEF4444), Color(0xFFEC4899)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                  borderRadius: BorderRadius.circular(2),
                ),
              );
            }),
          ),
        ),

        const SizedBox(height: 20),

        // Timer
        Text(
          _formatDuration(_duration),
          style: const TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.bold,
            color: Color(0xFFEF4444),
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Recording...',
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey,
          ),
        ),

        const SizedBox(height: 24),

        // Stop button
        ElevatedButton(
          onPressed: _stopRecording,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFEF4444),
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.stop, size: 20),
              SizedBox(width: 8),
              Text('Stop Recording'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPreviewUI() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          _formatDuration(_duration),
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Voice message ready',
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey,
          ),
        ),

        const SizedBox(height: 24),

        // Play Button (disabled on web for now)
        if (!kIsWeb)
          GestureDetector(
            onTap: () {
              // TODO: Implement playback
            },
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Icon(
                Icons.play_arrow_rounded,
                color: Color(0xFF8B5CF6),
                size: 32,
              ),
            ),
          ),

        const SizedBox(height: 24),

        // Actions
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _handleCancel,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.close, size: 20),
                    SizedBox(width: 8),
                    Text('Cancel'),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: _handleSend,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8B5CF6),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.send, size: 20),
                    SizedBox(width: 8),
                    Text('Send'),
                  ],
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
