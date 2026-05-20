import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/memory_provider.dart';

class MemoryDetailScreen extends StatelessWidget {
  const MemoryDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MemoryProvider>();
    final memory = provider.selectedMemory;

    if (memory == null) {
      return const Scaffold(
        body: Center(child: Text('Memory not found')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(memory.title),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(
              memory.isFavorite ? Icons.favorite : Icons.favorite_border,
              color: memory.isFavorite ? Colors.redAccent : Colors.white,
            ),
            onPressed: () => provider.toggleFavorite(memory.id),
          ),
        ],
      ),
      extendBodyBehindAppBar: true,
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0F0F1E), Color(0xFF1A0B2E), Color(0xFF0F0F1E)],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  memory.title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${memory.memoryType.replaceAll('_', ' ')} - ${_formatDate(memory.createdAt)}',
                  style: const TextStyle(color: Colors.white60),
                ),
                const SizedBox(height: 24),
                Text(
                  memory.description,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 24),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: memory.tags.map((tag) {
                    return Chip(
                      label: Text(tag),
                      backgroundColor:
                          const Color(0xFF8B5CF6).withOpacity(0.18),
                      labelStyle: const TextStyle(color: Colors.white),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 24),
                Text(
                  'Emotional significance: ${memory.emotionalSignificance}/10',
                  style: const TextStyle(color: Colors.white70),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
