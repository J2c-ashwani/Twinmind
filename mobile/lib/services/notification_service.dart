import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    // Request permission
    NotificationSettings settings = await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('User granted permission');
    }

    // Initialize local notifications
    const AndroidInitializationSettings androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    
    const DarwinInitializationSettings iosSettings =
        DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const InitializationSettings initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // Handle background messages
    FirebaseMessaging.onMessageOpenedApp.listen(_handleBackgroundMessage);

    // Get FCM token
    String? token = await _firebaseMessaging.getToken();
    print('FCM Token: $token');
    // TODO: Send token to backend
  }

  Future<void> _handleForegroundMessage(RemoteMessage message) async {
    print('Foreground message: ${message.notification?.title}');
    
    await _showLocalNotification(
      message.notification?.title ?? 'TwinMind',
      message.notification?.body ?? '',
      message.data,
    );
  }

  void _handleBackgroundMessage(RemoteMessage message) {
    print('Background message: ${message.notification?.title}');
    // Navigate to appropriate screen based on message data
  }

  void _onNotificationTap(NotificationResponse response) {
    print('Notification tapped: ${response.payload}');
    // Handle navigation based on payload
  }

  Future<void> _showLocalNotification(
    String title,
    String body,
    Map<String, dynamic> data,
  ) async {
    const AndroidNotificationDetails androidDetails =
        AndroidNotificationDetails(
      'twinmind_channel',
      'TwinMind Notifications',
      channelDescription: 'Notifications from your AI Twin',
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );

    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const NotificationDetails details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      DateTime.now().millisecond,
      title,
      body,
      details,
      payload: data.toString(),
    );
  }

  // Show specific notification types
  Future<void> showProactiveMessage(String message) async {
    await _showLocalNotification(
      'Message from your Twin',
      message,
      {'type': 'proactive_message'},
    );
  }

  Future<void> showAchievementUnlocked(String achievementName) async {
    await _showLocalNotification(
      '🏆 Achievement Unlocked!',
      'You earned: $achievementName',
      {'type': 'achievement'},
    );
  }

  Future<void> showStreakReminder(int streakDays) async {
    await _showLocalNotification(
      '🔥 Don\'t break your streak!',
      'You have a $streakDays day streak. Check in today!',
      {'type': 'streak_reminder'},
    );
  }

  Future<void> showDailyChallenges() async {
    await _showLocalNotification(
      '✨ New Daily Challenges',
      'Your daily challenges are ready!',
      {'type': 'daily_challenge'},
    );
  }

  Future<void> showMemoryAnniversary(String memoryTitle) async {
    await _showLocalNotification(
      '💙 Memory Anniversary',
      'Remember this? $memoryTitle',
      {'type': 'memory_anniversary'},
    );
  }
}

// Background message handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  print('Background message: ${message.notification?.title}');
}
