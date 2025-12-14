import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class DailyChallenge {
  final String id;
  final String title;
  final String description;
  final int xp;
  final bool completed;

  DailyChallenge({
    required this.id,
    required this.title,
    required this.description,
    required this.xp,
    required this.completed,
  });

  factory DailyChallenge.fromJson(Map<String, dynamic> json) {
    return DailyChallenge(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      xp: json['xp'] ?? 0,
      completed: json['completed'] ?? false,
    );
  }
}

class DailyProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  List<DailyChallenge> _challenges = [];
  bool _isLoading = false;
  String? _error;

  List<DailyChallenge> get challenges => _challenges;
  bool get isLoading => _isLoading;
  String? get error => _error;

  int get completedCount => _challenges.where((c) => c.completed).length;
  int get totalCount => _challenges.length;

  Future<void> loadChallenges(String? token) async {
    if (token == null) {
      _error = 'No access token available';
      notifyListeners();
      return;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _apiService.setToken(token);
      final data = await _apiService.getDailyChallenges();
      _challenges = (data)
          .map((json) => DailyChallenge.fromJson(json))
          .toList();
    } catch (e) {
      _error = e.toString();
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
          title: challenge.title,
          description: challenge.description,
          xp: challenge.xp,
          completed: true,
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
