import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/daily_provider.dart';

class DailyChallengesScreen extends StatefulWidget {
  const DailyChallengesScreen({super.key});

  @override
  State<DailyChallengesScreen> createState() => _DailyChallengesScreenState();
}

class _DailyChallengesScreenState extends State<DailyChallengesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DailyProvider>().loadChallenges();
    });
  }

  void _onTapChallenge(BuildContext context, DailyChallenge challenge, DailyProvider provider) {
    if (challenge.completed) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Challenge already completed for today! 🎉'),
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }

    switch (challenge.type) {
      case 'morning_reflection':
        _showReflectionModal(context, challenge, provider);
        break;
      case 'gratitude_moment':
        _showGratitudeModal(context, challenge, provider);
        break;
      case 'mindful_breathing':
        _showBreathingModal(context, challenge, provider);
        break;
      default:
        _directComplete(context, challenge, provider);
    }
  }

  Future<void> _directComplete(BuildContext context, DailyChallenge challenge, DailyProvider provider) async {
    final res = await provider.completeChallenge(challenge.id);
    if (!mounted) return;
    if (res != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Completed! +${challenge.reward} XP 🎉'),
          backgroundColor: const Color(0xFF10B981),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.actionError ?? 'Failed to complete challenge'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  void _showReflectionModal(BuildContext context, DailyChallenge challenge, DailyProvider provider) {
    final textController = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          return Container(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              top: 24,
              left: 24,
              right: 24,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text('☀️', style: TextStyle(fontSize: 28)),
                    const SizedBox(width: 12),
                    Text(
                      challenge.task,
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  challenge.description,
                  style: TextStyle(color: Colors.grey[600], fontSize: 14),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: textController,
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText: 'What is your main focus or goal for today?...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                    filled: true,
                    fillColor: Colors.grey[50],
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      backgroundColor: const Color(0xFF8B5CF6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            setModalState(() => isSubmitting = true);
                            final res = await provider.completeChallenge(
                              challenge.id,
                              inputs: {'reflection': textController.text.trim()},
                            );
                            setModalState(() => isSubmitting = false);
                            if (res != null) {
                              if (context.mounted) Navigator.pop(context);
                              if (this.context.mounted) {
                                ScaffoldMessenger.of(this.context).showSnackBar(
                                  SnackBar(
                                    content: Text('Reflection saved! +${challenge.reward} XP 🎉'),
                                    backgroundColor: const Color(0xFF10B981),
                                  ),
                                );
                              }
                            } else {
                              if (this.context.mounted) {
                                ScaffoldMessenger.of(this.context).showSnackBar(
                                  SnackBar(
                                    content: Text('Sync failed: ${provider.actionError ?? "Saved locally. Tap complete to retry."}'),
                                    backgroundColor: Colors.orangeAccent,
                                  ),
                                );
                              }
                            }
                          },
                    child: isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : Text('Complete Challenge (+${challenge.reward} XP)', style: const TextStyle(fontSize: 16, color: Colors.white)),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showGratitudeModal(BuildContext context, DailyChallenge challenge, DailyProvider provider) {
    final c1 = TextEditingController();
    final c2 = TextEditingController();
    final c3 = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          return Container(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              top: 24,
              left: 24,
              right: 24,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text('🙏', style: TextStyle(fontSize: 28)),
                    const SizedBox(width: 12),
                    Text(
                      challenge.task,
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Write down 3 things you are grateful for today.',
                  style: TextStyle(color: Colors.grey[600], fontSize: 14),
                ),
                const SizedBox(height: 16),
                _buildGratitudeField(c1, '1. Something that made you smile...'),
                const SizedBox(height: 8),
                _buildGratitudeField(c2, '2. A person or gesture you appreciate...'),
                const SizedBox(height: 8),
                _buildGratitudeField(c3, '3. An opportunity or privilege today...'),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      backgroundColor: const Color(0xFFEC4899),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            setModalState(() => isSubmitting = true);
                            final entries = [c1.text.trim(), c2.text.trim(), c3.text.trim()].where((e) => e.isNotEmpty).toList();
                            final res = await provider.completeChallenge(
                              challenge.id,
                              inputs: {'gratitude_items': entries},
                            );
                            setModalState(() => isSubmitting = false);
                            if (res != null) {
                              if (context.mounted) Navigator.pop(context);
                              if (this.context.mounted) {
                                ScaffoldMessenger.of(this.context).showSnackBar(
                                  SnackBar(
                                    content: Text('Gratitude recorded! +${challenge.reward} XP 🎉'),
                                    backgroundColor: const Color(0xFF10B981),
                                  ),
                                );
                              }
                            } else {
                              if (this.context.mounted) {
                                ScaffoldMessenger.of(this.context).showSnackBar(
                                  SnackBar(
                                    content: Text('Sync failed: ${provider.actionError ?? "Saved locally. Tap complete to retry."}'),
                                    backgroundColor: Colors.orangeAccent,
                                  ),
                                );
                              }
                            }
                          },
                    child: isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : Text('Complete Challenge (+${challenge.reward} XP)', style: const TextStyle(fontSize: 16, color: Colors.white)),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildGratitudeField(TextEditingController controller, String hint) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        hintText: hint,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: Colors.grey[50],
      ),
    );
  }

  void _showBreathingModal(BuildContext context, DailyChallenge challenge, DailyProvider provider) {
    showModalBottomSheet(
      context: context,
      isDismissible: false,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _BreathingModalWidget(
        challenge: challenge,
        provider: provider,
        parentContext: context,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Daily Challenges'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF8B5CF6), Color(0xFFEC4899)],
            ),
          ),
        ),
      ),
      body: Consumer<DailyProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error loading challenges: ${provider.error}', style: const TextStyle(color: Colors.red)),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => provider.loadChallenges(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (provider.challenges.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('No challenges found for today.', style: TextStyle(color: Colors.grey)),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => provider.loadChallenges(),
                    child: const Text('Refresh'),
                  ),
                ],
              ),
            );
          }

          return Column(
            children: [
              // Progress header
              Container(
                padding: const EdgeInsets.all(24),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF8B5CF6), Color(0xFFEC4899)],
                  ),
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(32),
                    bottomRight: Radius.circular(32),
                  ),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Today\'s Progress',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            '${provider.completedCount}/${provider.totalCount}',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: LinearProgressIndicator(
                        value: provider.totalCount > 0
                            ? provider.completedCount / provider.totalCount
                            : 0,
                        minHeight: 8,
                        backgroundColor: Colors.white.withValues(alpha: 0.3),
                        valueColor: const AlwaysStoppedAnimation<Color>(
                          Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Challenge list
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: provider.challenges.length,
                  itemBuilder: (context, index) {
                    final challenge = provider.challenges[index];
                    return _buildChallengeCard(challenge, provider);
                  },
                ),
              ),

              // Completion message
              if (provider.completedCount == provider.totalCount &&
                  provider.totalCount > 0)
                Container(
                  margin: const EdgeInsets.all(16),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF8B5CF6), Color(0xFFEC4899)],
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Column(
                    children: [
                      Text(
                        '🎉 All challenges completed!',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Come back tomorrow for new challenges!',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildChallengeCard(DailyChallenge challenge, DailyProvider provider) {
    final isCompleted = challenge.completed;

    return GestureDetector(
      onTap: () => _onTapChallenge(context, challenge, provider),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isCompleted ? const Color(0xFF10B981) : Colors.grey[200]!,
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Icon
            Text(
              _getChallengeIcon(challenge.type),
              style: const TextStyle(fontSize: 32),
            ),
            const SizedBox(width: 16),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    challenge.task,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      if (challenge.timeWindow != null) ...[
                        Icon(Icons.access_time, size: 14, color: Colors.grey[600]),
                        const SizedBox(width: 4),
                        Text(
                          challenge.timeWindow!,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                        const SizedBox(width: 16),
                      ],
                      const Icon(Icons.card_giftcard, size: 14, color: Color(0xFF8B5CF6)),
                      const SizedBox(width: 4),
                      Text(
                        '${challenge.reward} XP',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF8B5CF6),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Checkmark button
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isCompleted ? const Color(0xFF10B981) : Colors.grey[200],
              ),
              child: Icon(
                isCompleted ? Icons.check_circle : Icons.circle_outlined,
                color: isCompleted ? Colors.white : Colors.grey[400],
                size: 28,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getChallengeIcon(String type) {
    const icons = {
      'morning_reflection': '☀️',
      'gratitude_moment': '🙏',
      'mindful_breathing': '🧘',
      'evening_wins': '🌟',
      'vulnerability_challenge': '💙',
    };
    return icons[type] ?? '✨';
  }
}

class _BreathingModalWidget extends StatefulWidget {
  final DailyChallenge challenge;
  final DailyProvider provider;
  final BuildContext parentContext;

  const _BreathingModalWidget({
    required this.challenge,
    required this.provider,
    required this.parentContext,
  });

  @override
  State<_BreathingModalWidget> createState() => _BreathingModalWidgetState();
}

class _BreathingModalWidgetState extends State<_BreathingModalWidget> {
  int _secondsLeft = 60;
  Timer? _timer;
  bool _isFinished = false;
  String _phase = 'Inhale deeply...';

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsLeft <= 1) {
        timer.cancel();
        setState(() {
          _secondsLeft = 0;
          _isFinished = true;
          _phase = 'Breathing complete! ✓';
        });
        _completeBreathing();
      } else {
        setState(() {
          _secondsLeft--;
          final cycle = _secondsLeft % 8;
          if (cycle >= 4) {
            _phase = 'Inhale slowly...';
          } else {
            _phase = 'Exhale gently...';
          }
        });
      }
    });
  }

  Future<void> _completeBreathing() async {
    final res = await widget.provider.completeChallenge(
      widget.challenge.id,
      inputs: {'duration_seconds': 60},
    );
    if (!mounted) return;
    if (res != null) {
      ScaffoldMessenger.of(widget.parentContext).showSnackBar(
        SnackBar(
          content: Text('Mindful Breathing complete! +${widget.challenge.reward} XP 🎉'),
          backgroundColor: const Color(0xFF10B981),
        ),
      );
    } else {
      ScaffoldMessenger.of(widget.parentContext).showSnackBar(
        const SnackBar(
          content: Text('Breathing complete ✓ Progress saved. We\'ll sync when online.'),
          backgroundColor: Colors.orangeAccent,
        ),
      );
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Text('🧘', style: TextStyle(fontSize: 28)),
                  const SizedBox(width: 12),
                  Text(
                    widget.challenge.task,
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 24),
          AnimatedContainer(
            duration: const Duration(seconds: 4),
            width: _phase.contains('Inhale') ? 140 : 90,
            height: _phase.contains('Inhale') ? 140 : 90,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                colors: [Color(0xFF8B5CF6), Color(0xFFEC4899)],
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF8B5CF6).withValues(alpha: 0.4),
                  blurRadius: 20,
                  spreadRadius: 5,
                ),
              ],
            ),
            child: Center(
              child: Text(
                '$_secondsLeft s',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            _phase,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Color(0xFF8B5CF6)),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                backgroundColor: _isFinished ? const Color(0xFF10B981) : Colors.grey[300],
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              onPressed: () => Navigator.pop(context),
              child: Text(
                _isFinished ? 'Done' : 'Finish Early',
                style: TextStyle(fontSize: 16, color: _isFinished ? Colors.white : Colors.black87),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

