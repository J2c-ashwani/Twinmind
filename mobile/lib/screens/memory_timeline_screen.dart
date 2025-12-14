import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/memory_provider.dart';
import '../widgets/memory_card.dart';

class MemoryTimelineScreen extends StatefulWidget {
  const MemoryTimelineScreen({super.key});

  @override
  State<MemoryTimelineScreen> createState() => _MemoryTimelineScreenState();
}

class _MemoryTimelineScreenState extends State<MemoryTimelineScreen> {
  String _selectedFilter = 'all';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MemoryProvider>().loadMemories();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Memory Timeline'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF8B5CF6), Color(0xFFEC4899)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          // Filter chips
          Container(
            height: 60,
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _buildFilterChip('all', 'All'),
                _buildFilterChip('milestone', 'Milestone'),
                _buildFilterChip('conversation', 'Conversation'),
                _buildFilterChip('achievement', 'Achievement'),
                _buildFilterChip('emotion', 'Emotion'),
                _buildFilterChip('funny_moment', 'Funny'),
                _buildFilterChip('breakthrough', 'Breakthrough'),
              ],
            ),
          ),

          // Memory list
          Expanded(
            child: Consumer<MemoryProvider>(
              builder: (context, provider, child) {
                if (provider.isLoading) {
                  return const Center(
                    child: CircularProgressIndicator(),
                  );
                }

                if (provider.error != null) {
                  return Center(
                    child: Text('Error: ${provider.error}'),
                  );
                }

                final filteredMemories = _selectedFilter == 'all'
                    ? provider.memories
                    : provider.memories
                        .where((m) => m.memoryType == _selectedFilter)
                        .toList();

                if (filteredMemories.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.auto_awesome, size: 64, color: Colors.grey),
                        const SizedBox(height: 16),
                        Text(
                          'No memories yet',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Keep chatting to create special moments!',
                          style: TextStyle(color: Colors.grey),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () => provider.loadMemories(),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filteredMemories.length,
                    itemBuilder: (context, index) {
                      return MemoryCard(
                        memory: filteredMemories[index],
                        onTap: () {
                          provider.setSelectedMemory(filteredMemories[index]);
                          Navigator.pushNamed(context, '/memory-detail');
                        },
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String value, String label) {
    final isSelected = _selectedFilter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            _selectedFilter = value;
          });
        },
        selectedColor: const Color(0xFF8B5CF6),
        backgroundColor: Colors.black.withOpacity(0.3),
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : Colors.white70,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
    );
  }
}
