import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

class Memory {
  final String id;
  final String title;
  final String description;
  final String memoryType;
  final int emotionalSignificance;
  final List<String> tags;
  final bool isFavorite;
  final DateTime createdAt;
  final int referencedCount;

  Memory({
    required this.id,
    required this.title,
    required this.description,
    required this.memoryType,
    required this.emotionalSignificance,
    required this.tags,
    required this.isFavorite,
    required this.createdAt,
    required this.referencedCount,
  });

  factory Memory.fromJson(Map<String, dynamic> json) {
    return Memory(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      memoryType: json['memory_type'],
      emotionalSignificance: json['emotional_significance'],
      tags: List<String>.from(json['tags'] ?? []),
      isFavorite: json['is_favorite'] ?? false,
      createdAt: DateTime.parse(json['created_at']),
      referencedCount: json['referenced_count'] ?? 0,
    );
  }
}

class MemoryProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  List<Memory> _memories = [];
  Memory? _selectedMemory;
  bool _isLoading = false;
  String? _error;

  List<Memory> get memories => _memories;
  Memory? get selectedMemory => _selectedMemory;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadMemories() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await _apiService.getMemories();
      _memories = (data).map((json) => Memory.fromJson(json)).toList();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> toggleFavorite(String memoryId) async {
    try {
      await _apiService.toggleMemoryFavorite(memoryId);
      
      final index = _memories.indexWhere((m) => m.id == memoryId);
      if (index != -1) {
        final memory = _memories[index];
        _memories[index] = Memory(
          id: memory.id,
          title: memory.title,
          description: memory.description,
          memoryType: memory.memoryType,
          emotionalSignificance: memory.emotionalSignificance,
          tags: memory.tags,
          isFavorite: !memory.isFavorite,
          createdAt: memory.createdAt,
          referencedCount: memory.referencedCount,
        );
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  void setSelectedMemory(Memory? memory) {
    _selectedMemory = memory;
    notifyListeners();
  }
}
