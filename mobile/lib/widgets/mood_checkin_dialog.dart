import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/daily_provider.dart';

class MoodCheckInDialog extends StatefulWidget {
  const MoodCheckInDialog({super.key});

  @override
  State<MoodCheckInDialog> createState() => _MoodCheckInDialogState();
}

class _MoodCheckInDialogState extends State<MoodCheckInDialog> {
  int? _selectedMood;
  final TextEditingController _noteController = TextEditingController();
  final FocusNode _noteFocusNode = FocusNode();
  bool _isSubmitting = false;

  final List<Map<String, dynamic>> _moods = [
    {'value': 5, 'emoji': '😊', 'label': 'Great',      'color': Colors.green},
    {'value': 4, 'emoji': '😌', 'label': 'Good',       'color': Colors.lightGreen},
    {'value': 3, 'emoji': '😐', 'label': 'Okay',       'color': Colors.amber},
    {'value': 2, 'emoji': '😔', 'label': 'Down',       'color': Colors.orange},
    {'value': 1, 'emoji': '😢', 'label': 'Struggling', 'color': Colors.red},
  ];

  @override
  void dispose() {
    _noteController.dispose();
    _noteFocusNode.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (_selectedMood == null) return;

    // Dismiss keyboard before submitting
    FocusScope.of(context).unfocus();

    setState(() => _isSubmitting = true);

    // Capture messenger BEFORE popping so the SnackBar still works
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    try {
      await context.read<DailyProvider>().submitMoodCheckIn(
            _selectedMood!,
            _noteController.text.isEmpty ? null : _noteController.text,
          );

      if (mounted) {
        navigator.pop();
        messenger.showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white, size: 20),
                SizedBox(width: 10),
                Text(
                  'Mood check-in saved! ✨',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF8B5CF6),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        messenger.showSnackBar(
          SnackBar(
            content: Text('Failed to save: ${e.toString().replaceAll("Exception: ", "")}'),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // KEY FIX: pad bottom by keyboard height so nothing is hidden behind keyboard
    final keyboardInset = MediaQuery.viewInsetsOf(context).bottom;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      insetPadding: EdgeInsets.fromLTRB(24, 40, 24, keyboardInset + 24),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
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

              const SizedBox(height: 20),

              // Mood options
              ...List.generate(_moods.length, (index) {
                final mood = _moods[index];
                final isSelected = _selectedMood == mood['value'];

                return GestureDetector(
                  onTap: () => setState(() => _selectedMood = mood['value']),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? (mood['color'] as Color).withOpacity(0.12)
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
                          style: const TextStyle(fontSize: 28),
                        ),
                        const SizedBox(width: 14),
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
                        if (isSelected) ...[
                          const Spacer(),
                          Icon(Icons.check_circle,
                              color: mood['color'] as Color, size: 20),
                        ],
                      ],
                    ),
                  ),
                );
              }),

              // Optional note — only shows when a mood is selected
              if (_selectedMood != null) ...[
                const SizedBox(height: 16),
                TextField(
                  controller: _noteController,
                  focusNode: _noteFocusNode,
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
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                  ),
                  maxLines: 3,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _handleSubmit(),
                ),
              ],

              const SizedBox(height: 20),

              // Submit button — always fully visible
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _selectedMood == null || _isSubmitting
                      ? null
                      : _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8B5CF6),
                    disabledBackgroundColor: Colors.grey[300],
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
                            color: Colors.white,
                          ),
                        ),
                ),
              ),

              const SizedBox(height: 12),

              // Info text
              Center(
                child: Text(
                  '✨ Daily check-ins build your emotional journey',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
