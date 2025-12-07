import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'package:timeago/timeago.dart' as timeago;

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({Key? key}) : super(key: key);

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final ApiService _apiService = ApiService();
  List<dynamic> _notifications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    try {
      final notifications = await _apiService.getNotifications();
      setState(() {
        _notifications = notifications;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      // Don't show error for empty notifications, just log
      print('Error loading notifications: $e');
    }
  }

  Future<void> _markAsRead(String id, int index) async {
    try {
      await _apiService.markNotificationRead(id);
      setState(() {
        _notifications[index]['is_read'] = true;
      });
    } catch (e) {
      print('Error marking read: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      extendBodyBehindAppBar: true,
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.blue.shade900,
              Colors.purple.shade900,
            ],
          ),
        ),
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _notifications.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.notifications_off_outlined,
                          size: 64,
                          color: Colors.white.withOpacity(0.5),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'No notifications yet',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.7),
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 100, 16, 16),
                    itemCount: _notifications.length,
                    itemBuilder: (context, index) {
                      final notification = _notifications[index];
                      final isRead = notification['is_read'] == true;
                      
                      return Dismissible(
                        key: Key(notification['id']),
                        background: Container(
                          color: Colors.red,
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 20),
                          child: const Icon(Icons.delete, color: Colors.white),
                        ),
                        onDismissed: (direction) {
                          // TODO: Implement delete
                        },
                        child: Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          color: isRead 
                              ? Colors.white.withOpacity(0.05) 
                              : Colors.blue.withOpacity(0.2),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: ListTile(
                            contentPadding: const EdgeInsets.all(16),
                            leading: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.1),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                _getIconForType(notification['type']),
                                color: Colors.white,
                              ),
                            ),
                            title: Text(
                              notification['title'],
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
                              ),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(height: 4),
                                Text(
                                  notification['body'],
                                  style: TextStyle(
                                    color: Colors.white.withOpacity(0.8),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  timeago.format(DateTime.parse(notification['created_at'])),
                                  style: TextStyle(
                                    color: Colors.white.withOpacity(0.5),
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                            onTap: () {
                              if (!isRead) {
                                _markAsRead(notification['id'], index);
                              }
                              // Handle deep links if any
                              if (notification['data'] != null && 
                                  notification['data']['action'] == 'chat') {
                                Navigator.pop(context); // Go back to chat
                              }
                            },
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }

  IconData _getIconForType(String? type) {
    switch (type) {
      case 'smart_reminder':
        return Icons.lightbulb_outline;
      case 'coach':
        return Icons.self_improvement;
      case 'achievement':
        return Icons.emoji_events_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }
}
