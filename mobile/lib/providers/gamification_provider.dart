import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class Achievement {
  final String id;
  final String achievementType;
  final String achievementName;
  final String description;
  final String rarity;
  final String icon;
  final int points;
  final DateTime? unlockedAt;

  Achievement({
    required this.id,
    required this.achievementType,
    required this.achievementName,
    required this.description,
    required this.rarity,
    required this.icon,
    required this.points,
    this.unlockedAt,
  });

  factory Achievement.fromJson(Map<String, dynamic> json) {
    return Achievement(
      id: json['id'],
      achievementType: json['achievement_type'],
      achievementName: json['achievement_name'],
      description: json['description'],
      rarity: json['rarity'],
      icon: json['icon'],
      points: json['points'],
      unlockedAt: json['unlocked_at'] != null 
          ? DateTime.parse(json['unlocked_at']) 
          : null,
    );
  }

  bool get isUnlocked => unlockedAt != null;
}

class Streak {
  final String id;
  final String streakType;
  final int currentStreak;
  final int longestStreak;
  final DateTime lastActivityDate;

  Streak({
    required this.id,
    required this.streakType,
    required this.currentStreak,
    required this.longestStreak,
    required this.lastActivityDate,
  });

  factory Streak.fromJson(Map<String, dynamic> json) {
    return Streak(
      id: json['id'],
      streakType: json['streak_type'],
      currentStreak: json['current_streak'],
      longestStreak: json['longest_streak'],
      lastActivityDate: DateTime.parse(json['last_activity_date']),
    );
  }
}

class UserLevel {
  final String currentLevel;
  final int levelNumber;
  final int experiencePoints;

  UserLevel({
    required this.currentLevel,
    required this.levelNumber,
    required this.experiencePoints,
  });

  factory UserLevel.fromJson(Map<String, dynamic> json) {
    return UserLevel(
      currentLevel: json['current_level'],
      levelNumber: json['level_number'],
      experiencePoints: json['experience_points'],
    );
  }
}

class GamificationProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  List<Achievement> _achievements = [];
  List<Streak> _streaks = [];
  UserLevel? _level;
  bool _isLoading = true; // Default to true
  String? _error;

  List<Achievement> get achievements => _achievements;
  List<Streak> get streaks => _streaks;
  UserLevel? get level => _level;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Streak? get dailyStreak => _streaks.firstWhere(
    (s) => s.streakType == 'daily_checkin',
    orElse: () => Streak(
      id: '',
      streakType: 'daily_checkin',
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: DateTime.now(),
    ),
  );

  Future<void> loadGamificationStatus([String? token]) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final accessToken = token ?? Supabase.instance.client.auth.currentSession?.accessToken;
      
      if (accessToken == null) {
        throw Exception('Not authenticated. Please log in again.');
      }

      _apiService.setToken(accessToken);
      final data = await _apiService.getGamificationStatus();
      
      _achievements = (data['achievements'] as List)
          .map((json) => Achievement.fromJson(json))
          .toList();
      
      _streaks = (data['streaks'] as List)
          .map((json) => Streak.fromJson(json))
          .toList();
      
      _level = UserLevel.fromJson(data['level']);
    } catch (e) {
      print('🔴 GamificationProvider Error: $e');
      _error = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void addAchievement(Achievement achievement) {
    _achievements.add(achievement);
    notifyListeners();
  }
}
