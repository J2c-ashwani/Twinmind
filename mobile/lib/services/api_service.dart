import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = kReleaseMode 
      ? 'https://twinmind-9l6x.onrender.com'
      : 'http://localhost:5001'; // Backend API port
  String? _token;

  void setToken(String token) {
    if (token.isEmpty || token.split('.').length != 3) {
      print('WARNING: Setting invalid JWT token format: ${token.length > 20 ? token.substring(0, 20) : token}...');
    } else {
      print('DEBUG: Token set successfully (length: ${token.length})');
    }
    _token = token;
  }

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  // Memory endpoints
  Future<List<dynamic>> getMemories() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/memory/memories'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load memories');
  }

  Future<void> toggleMemoryFavorite(String memoryId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/memory/$memoryId/favorite'),
      headers: _headers,
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to toggle favorite');
    }
  }

  // Gamification endpoints
  Future<Map<String, dynamic>> getGamificationStatus() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/status'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load gamification status');
  }

  // Daily endpoints
  Future<List<dynamic>> getDailyChallenges() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/daily/challenges'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load challenges');
  }

  Future<void> completeChallenge(String challengeId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/daily/challenges/$challengeId/complete'),
      headers: _headers,
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to complete challenge');
    }
  }

  Future<void> submitMoodCheckIn(int mood, String? note) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/daily/mood'),
      headers: _headers,
      body: json.encode({'mood': mood, 'note': note}),
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to submit mood');
    }
  }

  Future<List<dynamic>> getMoodHistory({int days = 7}) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/daily/mood/history?days=$days'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load mood history');
  }

  // Personality endpoints
  Future<Map<String, dynamic>> getPersonalityProfile() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/personality/profile'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load personality profile');
  }

  Future<List<dynamic>> getQuestions() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/personality/questions'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['questions'] ?? [];
    }
    throw Exception('Failed to load questions');
  }

  Future<void> submitAnswers(List<Map<String, dynamic>> answers, String token) async {
    final headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
    
    final response = await http.post(
      Uri.parse('$baseUrl/api/personality/submit-answers'),
      headers: headers,
      body: json.encode({'answers': answers}),
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to submit answers');
    }
  }

  Future<Map<String, dynamic>> generatePersonality(String token) async {
    final headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
    
    final response = await http.post(
      Uri.parse('$baseUrl/api/personality/generate'),
      headers: headers,
      body: json.encode({'answers': []}), // Fix: Send empty answers array if needed or remove body if not required by backend
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to generate personality');
  }

  // Chat endpoints
  Future<List<dynamic>> getModes() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/chat/modes'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['modes'] ?? [];
    }
    throw Exception('Failed to load modes');
  }

  Future<Map<String, dynamic>> getChatHistory({
    String? mode,
    String? conversationId,
  }) async {
    String url = '$baseUrl/api/chat/history?limit=50';
    if (mode != null && mode.isNotEmpty) {
      url += '&mode=$mode';
    }
    if (conversationId != null && conversationId.isNotEmpty) {
      url += '&conversation_id=$conversationId';
    }
    
    final response = await http.get(
      Uri.parse(url),
      headers: _headers,
    );
    
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load chat history');
  }

  Future<List<dynamic>> getConversations() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/conversations'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['conversations'] ?? [];
    }
    throw Exception('Failed to load conversations');
  }

  Future<Map<String, dynamic>> createConversation(String title) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/conversations'),
      headers: _headers,
      body: json.encode({'title': title}),
    );
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['conversation'];
    }
    throw Exception('Failed to create conversation');
  }

  Future<List<dynamic>> getConversationMessages(String id) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/conversations/$id'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['messages'] ?? [];
    }
    throw Exception('Failed to load messages');
  }

  Future<void> deleteConversation(String id) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/api/conversations/$id'),
      headers: _headers,
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to delete conversation');
    }
  }

  Future<void> clearChatHistory() async {
    final response = await http.delete(
      Uri.parse('$baseUrl/api/chat/history'),
      headers: _headers,
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to clear chat history');
    }
  }

  Future<Map<String, dynamic>> getAchievements() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/achievements'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load achievements');
  }

  Future<Map<String, dynamic>> getStreaks() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/streaks'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load streaks');
  }

  Future<Map<String, dynamic>> getLevel() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/level'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load level');
  }

  Future<Map<String, dynamic>> sendMessage(
    String message,
    String mode,
    {String? token, String? conversationId}
  ) async {
    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
      if (token == null && _token != null) 'Authorization': 'Bearer $_token',
    };
    
    final response = await http.post(
      Uri.parse('$baseUrl/api/chat/message'),
      headers: headers,
      body: json.encode({
        'message': message,
        'mode': mode,
        if (conversationId != null) 'conversation_id': conversationId,
      }),
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to send message');
  }

  // Insights endpoints
  Future<Map<String, dynamic>> getWeeklyInsights() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/insights/weekly'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load insights');
  }

  // Referral endpoints
  Future<Map<String, dynamic>> getReferralCode() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/referral/code'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load referral code');
  }

  Future<Map<String, dynamic>> getReferralStats() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/referral/stats'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load referral stats');
  }

  // Additional Personality endpoints
  Future<Map<String, dynamic>> regeneratePersonality() async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/personality/regenerate'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to regenerate personality');
  }

  // Additional Memory endpoints
  Future<Map<String, dynamic>> getMemoryCount() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/memory/count'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load memory count');
  }

  // Additional Insights endpoints
  Future<Map<String, dynamic>> getMonthlyInsights() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/insights/monthly'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load monthly insights');
  }

  Future<Map<String, dynamic>> getEvolutionInsights() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/insights/evolution'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load evolution insights');
  }

  // Subscription endpoints
  Future<Map<String, dynamic>> getSubscriptionStatus() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/subscription/status'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load subscription status');
  }

  Future<Map<String, dynamic>> createCheckoutSession(String tier) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/subscription/create-checkout'),
      headers: _headers,
      body: json.encode({'tier': tier}),
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to create checkout session');
  }

  Future<void> cancelSubscription() async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/subscription/cancel'),
      headers: _headers,
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to cancel subscription');
    }
  }

  // Conversation update
  Future<void> updateConversationTitle(String id, String title) async {
    final response = await http.patch(
      Uri.parse('$baseUrl/api/conversations/$id'),
      headers: _headers,
      body: json.encode({'title': title}),
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to update conversation');
    }
  }

  // Pricing endpoints
  Future<Map<String, dynamic>> getPricingPlans() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/pricing/'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load pricing plans');
  }

  // Growth Circles
  Future<Map<String, dynamic>> createCircle({String name = 'My Growth Circle'}) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/circles'),
      headers: _headers,
      body: json.encode({'name': name}),
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to create circle');
  }

  Future<Map<String, dynamic>> getMyCircle() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/circles/my'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load circle');
  }

  Future<Map<String, dynamic>> getCircleProgress(String circleId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/circles/$circleId/progress'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load circle progress');
  }

  Future<Map<String, dynamic>> createCircleInvitation(String circleId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/circles/$circleId/invite'),
      headers: _headers,
      body: json.encode({}),
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to create invitation');
  }

  Future<Map<String, dynamic>> joinCircle(String code) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/circles/join/$code'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to join circle');
  }

  Future<void> leaveCircle(String circleId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/circles/$circleId/leave'),
      headers: _headers,
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to leave circle');
    }
  }

  // Streak Freeze
  Future<Map<String, dynamic>> getFreezeStatus() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/gamification/freeze/status'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load freeze status');
  }

  Future<Map<String, dynamic>> purchaseStreakFreeze(String purchaseType) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/gamification/freeze/purchase'),
      headers: _headers,
      body: json.encode({'purchaseType': purchaseType}),
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to purchase freeze');
  }

  // Motivation Cards
  Future<Map<String, dynamic>> getWeeklyMotivationCard() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/motivation-cards/weekly'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load motivation card');
  }

  Future<Map<String, dynamic>> generateMotivationCard() async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/motivation-cards/generate'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to generate card');
  }

  Future<void> markCardShared(String cardId, String platform) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/motivation-cards/$cardId/share'),
      headers: _headers,
      body: json.encode({'platform': platform}),
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to mark as shared');
    }
  }

  // Growth Story
  Future<Map<String, dynamic>> getYearCalendar({int? year}) async {
    final currentYear = year ?? DateTime.now().year;
    final response = await http.get(
      Uri.parse('$baseUrl/api/growth-story/calendar/$currentYear'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load year calendar');
  }

  Future<Map<String, dynamic>> getGrowthInsights(String period) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/growth-story/insights/$period'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load insights');
  }

  // Twin Match
  Future<Map<String, dynamic>> findUserForMatch(String identifier) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/twin-match/find'),
      headers: _headers,
      body: json.encode({'identifier': identifier}),
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('User not found');
  }

  Future<Map<String, dynamic>> compareTwins(String identifier) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/twin-match/compare'),
      headers: _headers,
      body: json.encode({'identifier': identifier}),
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to compare');
  }

  // Life Coach endpoints
  // Fallback programs matching web app
  static const List<Map<String, dynamic>> _fallbackPrograms = [
    {
      'id': '1',
      'title': 'Anxiety Relief Journey',
      'description': 'A 7-day guided program to understand and manage anxiety using proven techniques.',
      'category': 'anxiety',
      'duration_days': 7,
      'is_premium': false
    },
    {
      'id': '2',
      'title': 'Confidence Builder',
      'description': 'Build unshakeable self-confidence with daily exercises and mindset shifts.',
      'category': 'growth',
      'duration_days': 14,
      'is_premium': false
    },
    {
      'id': '3',
      'title': 'Emotional Intelligence Mastery',
      'description': 'Master your emotions and develop deeper connections with others.',
      'category': 'mindfulness',
      'duration_days': 21,
      'is_premium': true
    },
    {
      'id': '4',
      'title': 'Career Growth Accelerator',
      'description': 'Unlock your professional potential with goal-setting and productivity coaching.',
      'category': 'growth',
      'duration_days': 30,
      'is_premium': true
    },
    {
      'id': '5',
      'title': 'Daily Mindfulness Practice',
      'description': 'Start each day with calm and clarity through guided meditation sessions.',
      'category': 'mindfulness',
      'duration_days': 7,
      'is_premium': false
    },
    {
      'id': '6',
      'title': 'Relationship Healing',
      'description': 'Repair and strengthen your most important relationships with guided exercises.',
      'category': 'anxiety',
      'duration_days': 14,
      'is_premium': true
    }
  ];

  Future<List<dynamic>> getLifeCoachPrograms() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/life-coach/programs'),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data is List && data.isNotEmpty) {
          return data;
        }
      }
      return _fallbackPrograms;
    } catch (e) {
      print('API Error: $e');
      return _fallbackPrograms;
    }
  }

  Future<Map<String, dynamic>> startProgram(String programId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/life-coach/start'),
      headers: _headers,
      body: json.encode({'programId': programId}),
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to start program');
  }

  Future<Map<String, dynamic>> getSession(String programId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/life-coach/session/$programId'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load session');
  }

  Future<Map<String, dynamic>> sendSessionMessage(
    String programId,
    String message,
    List<Map<String, String>> history,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/life-coach/session/$programId/message'),
      headers: _headers,
      body: json.encode({
        'message': message,
        'history': history,
      }),
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to send message');
  }

  Future<void> completeSession(String programId, String notes) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/life-coach/session/$programId/complete'),
      headers: _headers,
      body: json.encode({'notes': notes}),
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to complete session');
    }
  }

  // Voice Message endpoint
  Future<Map<String, dynamic>> sendVoiceMessage(
    String audioFilePath,
    String mode,
    String? conversationId,
  ) async {
    try {
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/api/voice/message'),
      );

      // Add headers
      if (_token != null) {
        request.headers['Authorization'] = 'Bearer $_token';
      } else {
        throw Exception('Authentication required');
      }

      // Add fields
      request.fields['mode'] = mode;
      if (conversationId != null) {
        request.fields['conversationId'] = conversationId;
      }

      // Add audio file with proper filename and extension
      final audioFile = await http.MultipartFile.fromPath(
        'audio',
        audioFilePath,
        filename: 'voice.aac', // Specify filename with extension
      );
      request.files.add(audioFile);

      // Send request
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseData = json.decode(response.body);
        return responseData;
      } else {
        // Parse error message from response
        String errorMessage = 'Failed to send voice message';
        try {
          final errorData = json.decode(response.body);
          errorMessage = errorData['error'] ?? errorMessage;
        } catch (_) {
          errorMessage = 'Server error: ${response.statusCode}';
        }
        throw Exception(errorMessage);
      }
    } catch (e) {
      if (e is Exception) {
        rethrow;
      }
      throw Exception('Failed to send voice message: $e');
    }
  }

  // Notification endpoints
  Future<List<dynamic>> getNotifications() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/notifications'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load notifications');
  }

  Future<void> markNotificationRead(String id) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/notifications/$id/read'),
      headers: _headers,
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to mark read');
    }
  }

  Future<void> updateFcmToken(String token) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/notifications/device-token'),
      headers: _headers,
      body: json.encode({'token': token}),
    );
    if (response.statusCode != 200) {
      // Don't throw - just log, as this is background sync
      print('Failed to update FCM token');
    }
  }


}
