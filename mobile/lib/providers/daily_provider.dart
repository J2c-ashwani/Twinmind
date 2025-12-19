import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class DailyChallenge {
  final String id;
  final String type;
  final String task;
  final int reward;
  final bool completed;
  final String? timeWindow;

  DailyChallenge({
    required this.id,
    required this.type,
    required this.task,
    required this.reward,
    required this.completed,
    this.timeWindow,
  });

  factory DailyChallenge.fromJson(Map<String, dynamic> json) {
    return DailyChallenge(
      id: json['id']?.toString() ?? '',
      type: json['type'] ?? '',
      task: json['task'] ?? '',
      reward: json['reward'] ?? 0,
      completed: json['completed'] ?? false,
      timeWindow: json['time_window'],
    );
  }
}

class DailyProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  List<DailyChallenge> _challenges = [];
  bool _isLoading = true; // Default to true to show loading initially
  String? _error;

  List<DailyChallenge> get challenges => _challenges;
  bool get isLoading => _isLoading;
  String? get error => _error;

  int get completedCount => _challenges.where((c) => c.completed).length;
  int get totalCount => _challenges.length;

  Future<void> loadChallenges([String? token]) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Try to get token from arguments or Supabase directly
      final accessToken = token ?? Supabase.instance.client.auth.currentSession?.accessToken;
      
      if (accessToken == null) {
        throw Exception('Not authenticated. Please log in again.');
      }

      _apiService.setToken(accessToken);
      final data = await _apiService.getDailyChallenges();
      
      if (data is! List) throw Exception('Invalid data format received');
      
      _challenges = (data)
          .map((json) => DailyChallenge.fromJson(json))
          .toList();
          
    } catch (e) {
      print('🔴 DailyProvider Error: $e');
      _error = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> completeChallenge(String challengeId) async {
    try {
      await _apiService.completeChallenge(challengeId);
      
      final index = _challenges.indexWhere((c) => c.id == challengeId);
      if (index != -1) {
        final challenge = _challenges[index];
        _challenges[index] = DailyChallenge(
          id: challenge.id,
          type: challenge.type,
          task: challenge.task,
          reward: challenge.reward,
          completed: true,
          timeWindow: challenge.timeWindow,
        );
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<void> submitMoodCheckIn(int mood, String? note) async {
    try {
      await _apiService.submitMoodCheckIn(mood, note);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }
}
