import 'dart:ui' as ui;
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

class WeeklyMotivationCardWidget extends StatefulWidget {
  const WeeklyMotivationCardWidget({super.key});

  @override
  State<WeeklyMotivationCardWidget> createState() =>
      _WeeklyMotivationCardWidgetState();
}

class _WeeklyMotivationCardWidgetState
    extends State<WeeklyMotivationCardWidget> {
  Map<String, dynamic>? _card;
  bool _isLoading = true;
  bool _isGenerating = false;
  bool _isSharing = false;

  // Key used to capture the card widget as a PNG image for sharing
  final GlobalKey _cardCaptureKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    _loadCard();
  }

  Future<void> _loadCard() async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final token = authService.getAccessToken();

      if (token == null) {
        setState(() => _isLoading = false);
        return;
      }

      final api = ApiService();
      api.setToken(token);

      final data = await api.getWeeklyMotivationCard();
      setState(() {
        _card = data['card'];
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Failed to load card: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _generateCard() async {
    setState(() => _isGenerating = true);

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final token = authService.getAccessToken();

      if (token == null) {
        setState(() => _isGenerating = false);
        return;
      }

      final api = ApiService();
      api.setToken(token);

      final data = await api.generateMotivationCard();
      if (mounted) {
        setState(() {
          _card = data['card'];
          _isGenerating = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_card != null
                ? 'Weekly Motivation Card generated! ✨'
                : 'Could not generate card. Chat a bit more with your Twin!'),
            backgroundColor:
                _card != null ? const Color(0xFF9333EA) : Colors.orangeAccent,
          ),
        );
      }
    } catch (e) {
      debugPrint('Failed to generate card: $e');
      if (mounted) {
        setState(() => _isGenerating = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Failed to generate card: ${e.toString().replaceAll("Exception: ", "")}'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  Future<void> _shareCard() async {
    if (_card == null) return;
    setState(() => _isSharing = true);

    try {
      // 1. Capture the card widget as a high-resolution image
      final boundary =
          _cardCaptureKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;

      if (boundary == null) {
        // RepaintBoundary not available — fallback to text
        await _shareAsText();
        return;
      }

      // Render at 3× pixel ratio for crisp output on high-density screens
      final image = await boundary.toImage(pixelRatio: 3.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) throw Exception('Image encoding failed');

      // 2. Write PNG bytes to a temp file
      final tempDir = await getTemporaryDirectory();
      final filePath =
          '${tempDir.path}/twinmind_motivation_${DateTime.now().millisecondsSinceEpoch}.png';
      final file = File(filePath);
      await file.writeAsBytes(byteData.buffer.asUint8List());

      // 3. Share the image file with caption
      await Share.shareXFiles(
        [XFile(filePath, mimeType: 'image/png')],
        text:
            'My weekly motivation from my AI Twin! 🌟\n\nGet yours at TwinGenie',
        subject: 'My Weekly Motivation',
      );

      // 4. Mark as shared in backend (fire-and-forget, non-blocking)
      _markSharedInBackground();
    } catch (e) {
      debugPrint('Image share failed ($e), falling back to text');
      await _shareAsText();
    } finally {
      if (mounted) setState(() => _isSharing = false);
    }
  }

  Future<void> _shareAsText() async {
    try {
      await Share.share(
        '"${_card!['quote']}" — ${_card!['twin_name']}\n\nGet your own AI companion at TwinGenie',
        subject: 'My Weekly Motivation',
      );
      _markSharedInBackground();
    } catch (_) {}
  }

  void _markSharedInBackground() {
    final cardId = _card?['id'];
    if (cardId == null) return;
    final authService = Provider.of<AuthService>(context, listen: false);
    final token = authService.getAccessToken();
    if (token == null) return;
    final api = ApiService();
    api.setToken(token);
    api.markCardShared(cardId, 'native').catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [
            Colors.purple.withOpacity(0.1),
            Colors.pink.withOpacity(0.1)
          ]),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.purple.withOpacity(0.2)),
        ),
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_card == null) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [
            Colors.purple.withOpacity(0.1),
            Colors.pink.withOpacity(0.1)
          ]),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.purple.withOpacity(0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              const Icon(Icons.auto_awesome,
                  color: Colors.purpleAccent, size: 24),
              const SizedBox(width: 12),
              Text('Weekly Motivation',
                  style: TextStyle(
                      color: Colors.white.withOpacity(0.7), fontSize: 14)),
            ]),
            const SizedBox(height: 16),
            Text(
              'Chat more this week to unlock your personalized motivation card!',
              style:
                  TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 14),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _isGenerating ? null : _generateCard,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF9333EA),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 45),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child:
                  Text(_isGenerating ? 'Generating...' : 'Try to Generate Now'),
            ),
          ],
        ),
      );
    }

    final weekStart = DateTime.parse(_card!['week_start']).toLocal();
    final weekEnd = DateTime.parse(_card!['week_end']).toLocal();

    // RepaintBoundary wraps only the visual card (excluding buttons)
    // so the shared image shows just the card, not the action buttons.
    return Column(
      children: [
        RepaintBoundary(
          key: _cardCaptureKey,
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Colors.purple.withOpacity(0.2),
                  Colors.pink.withOpacity(0.2),
                ],
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.purple.withOpacity(0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(children: [
                  const Icon(Icons.auto_awesome,
                      color: Colors.purpleAccent, size: 28),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Weekly Motivation',
                            style: TextStyle(
                                fontSize: 10,
                                color: Colors.white.withOpacity(0.5))),
                        Text(
                          '${_formatDate(weekStart)} - ${_formatDate(weekEnd)}',
                          style: TextStyle(
                              fontSize: 12,
                              color: Colors.white.withOpacity(0.7)),
                        ),
                      ],
                    ),
                  ),
                ]),
                const SizedBox(height: 20),

                // Quote
                Text(
                  '"${_card!['quote']}"',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                    fontStyle: FontStyle.italic,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    '— ${_card!['twin_name']}',
                    style: TextStyle(
                        fontSize: 14, color: Colors.white.withOpacity(0.6)),
                  ),
                ),
                const SizedBox(height: 8),

                // Subtle TwinGenie branding shown in the shared image
                Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    'TwinGenie',
                    style: TextStyle(
                        fontSize: 10,
                        color: Colors.purpleAccent.withOpacity(0.6),
                        letterSpacing: 1.2),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Action buttons (outside RepaintBoundary — not included in the shared image)
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _isSharing ? null : _shareCard,
                icon: _isSharing
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.share, size: 18),
                label: Text(_isSharing ? 'Sharing...' : 'Share'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white.withOpacity(0.1),
                  foregroundColor: Colors.white,
                  side: BorderSide(color: Colors.white.withOpacity(0.2)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(width: 12),
            ElevatedButton.icon(
              onPressed: _isGenerating ? null : _generateCard,
              icon: const Icon(Icons.refresh, size: 18),
              label: Text(_isGenerating ? '...' : 'Regenerate'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white.withOpacity(0.1),
                foregroundColor: Colors.white,
                side: BorderSide(color: Colors.white.withOpacity(0.2)),
                padding:
                    const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ],
    );
  }

  String _formatDate(DateTime date) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${months[date.month - 1]} ${date.day}';
  }
}
