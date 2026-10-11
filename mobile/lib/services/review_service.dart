import 'package:flutter/foundation.dart';
import 'package:in_app_review/in_app_review.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ReviewService {
  static const String _keyHasPrompted = 'has_prompted_review';
  static const String _keyChatCount = 'review_qualifying_chat_count';
  static const int _triggerMilestone = 3; // Prompt after 3 meaningful conversational exchanges

  static final InAppReview _inAppReview = InAppReview.instance;

  /// Increments the qualifying interaction counter and triggers Google's native
  /// in-app review prompt once the user reaches the milestone.
  /// Follows Google Play policy: no rating gate, full user autonomy.
  static Future<void> checkAndPromptReview() async {
    if (kIsWeb) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      final hasPrompted = prefs.getBool(_keyHasPrompted) ?? false;
      if (hasPrompted) return;

      int count = (prefs.getInt(_keyChatCount) ?? 0) + 1;
      await prefs.setInt(_keyChatCount, count);

      if (count >= _triggerMilestone) {
        if (await _inAppReview.isAvailable()) {
          await _inAppReview.requestReview();
          await prefs.setBool(_keyHasPrompted, true);
        }
      }
    } catch (e) {
      debugPrint('ReviewService.checkAndPromptReview error: $e');
    }
  }

  /// Opens the store listing directly when requested explicitly by the user (e.g. from Settings).
  static Future<void> openStoreListing() async {
    try {
      if (await _inAppReview.isAvailable()) {
        await _inAppReview.openStoreListing();
      }
    } catch (e) {
      debugPrint('ReviewService.openStoreListing error: $e');
    }
  }
}
