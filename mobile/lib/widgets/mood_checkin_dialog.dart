import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/daily_provider.dart';

class MoodCheckInDialog extends StatefulWidget {
  const MoodCheckInDialog({Key? key}) : super(key: key);

  @override
  State<MoodCheckInDialog> createState() => _MoodCheckInDialogState();
}

class _MoodCheckInDialogState extends State<MoodCheckInDialog> {
  int? _selectedMood;
  final TextEditingController _noteController = TextEditingController();
  bool _isSubmitting = false;

  final List<Map<String, dynamic>> _moods = [
    {'value': 2, 'emoji': '😊', 'label': 'Great', 'color': Colors.green},
    {'value': 1, 'emoji': '😌', 'label': 'Good', 'color': Colors.blue},
    {'value': 0, 'emoji': '😐', 'label': 'Okay', 'color': Colors.grey},
    {'value': -1, 'emoji': '😔', 'label': 'Down', 'color': Colors.orange},
    {'value': -2, 'emoji': '😢', 'label': 'Struggling', 'color': Colors.red},
  ];

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (_selectedMood == null) return;

    setState(() => _isSubmitting = true);

    try {
      await context.read<DailyProvider>().submitMoodCheckIn(
            _selectedMood!,
            _noteController.text.isEmpty ? null : _noteController.text,
          );
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Mood check-in submitted!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'How are you feeling?',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Mood options
            ...List.generate(_moods.length, (index) {
              final mood = _moods[index];
              final isSelected = _selectedMood == mood['value'];

              return GestureDetector(
                onTap: () => setState(() => _selectedMood = mood['value']),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? (mood['color'] as Color).withOpacity(0.1)
                        : Colors.grey[100],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected
                          ? (mood['color'] as Color)
                          : Colors.transparent,
                      width: 2,
                    ),
                  ),
                  child: Row(
                    children: [
                      Text(
                        mood['emoji'],
                        style: const TextStyle(fontSize: 32),
                      ),
                      const SizedBox(width: 16),
                      Text(
                        mood['label'],
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: isSelected
                              ? FontWeight.bold
                              : FontWeight.normal,
                          color: isSelected
                              ? (mood['color'] as Color)
                              : Colors.black87,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),

            // Optional note
            if (_selectedMood != null) ...[
              const SizedBox(height: 16),
              TextField(
                controller: _noteController,
                decoration: InputDecoration(
                  hintText: 'Want to share more? (optional)',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                      color: Color(0xFF8B5CF6),
                      width: 2,
                    ),
                  ),
                ),
                maxLines: 3,
              ),
            ],

            const SizedBox(height: 24),

            // Submit button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _selectedMood == null || _isSubmitting
                    ? null
                    : _handleSubmit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8B5CF6),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text(
                        'Submit Check-In',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),

            const SizedBox(height: 12),

            // Info text
            Text(
              '✨ Daily check-ins help track your emotional journey',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
