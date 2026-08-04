import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/api_service.dart';

void _notificationLog(String message) {
  if (kDebugMode) {
    print(message);
  }
}

/// Background message handler - must be top-level function
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  _notificationLog('Background message: ${message.notification?.title}');
}

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  bool _isInitialized = false;
  String? _fcmToken;

  /// Get the FCM token for this device
  String? get fcmToken => _fcmToken;

  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // Request permission for notifications
      NotificationSettings settings =
          await _firebaseMessaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
        announcement: false,
        carPlay: false,
        criticalAlert: false,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        _notificationLog('✅ User granted notification permission');
      } else if (settings.authorizationStatus ==
          AuthorizationStatus.provisional) {
        _notificationLog('⚠️ User granted provisional notification permission');
      } else {
        _notificationLog('❌ User declined notification permission');
      }

      // Initialize local notifications for foreground display
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

      // Create notification channel for Android
      const AndroidNotificationChannel channel = AndroidNotificationChannel(
        'twinmind_high_importance',
        'TwinGenie Notifications',
        description: 'Important notifications from your AI Twin',
        importance: Importance.high,
      );

      await _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // Handle when app is opened from notification
      FirebaseMessaging.onMessageOpenedApp.listen(_handleBackgroundMessage);

      // Get FCM token
      _fcmToken = await _firebaseMessaging.getToken();
      _notificationLog('📱 FCM token acquired');

      // Listen for token refresh
      _firebaseMessaging.onTokenRefresh.listen((newToken) {
        _fcmToken = newToken;
        _notificationLog('🔄 FCM token refreshed');
        syncTokenToBackend();
      });

      _isInitialized = true;
      _notificationLog('✅ NotificationService initialized successfully');

      // Send initial token
      if (_fcmToken != null) {
        await syncTokenToBackend();
      }
    } catch (e) {
      _notificationLog('❌ Failed to initialize NotificationService: $e');
    }
  }

  Future<void> syncTokenToBackend() async {
    try {
      final token = await _firebaseMessaging.getToken();
      print('FCM TOKEN: $token');

      if (token == null) {
        print('❌ FCM TOKEN IS NULL');
        return;
      }
      _fcmToken = token;
      await _sendTokenToBackend(token);
    } catch (e) {
      print('❌ FCM TOKEN ACQUISITION ERROR: $e');
    }
  }

  Future<void> _handleForegroundMessage(RemoteMessage message) async {
    _notificationLog('📩 Foreground message: ${message.notification?.title}');

    // Show local notification when app is in foreground
    await _showLocalNotification(
      message.notification?.title ?? 'TwinGenie',
      message.notification?.body ?? '',
      message.data,
    );
  }

  void _handleBackgroundMessage(RemoteMessage message) {
    _notificationLog(
      '📩 App opened from notification: ${message.notification?.title}',
    );
    // Navigate to appropriate screen based on message data
    _handleNotificationNavigation(message.data);
  }

  void _handleNotificationNavigation(Map<String, dynamic> data) {
    final type = data['type'];
    switch (type) {
      case 'smart_reminder':
        // Navigate to notifications screen
        break;
      case 'achievement':
        // Navigate to achievements screen
        break;
      case 'daily_challenge':
        // Navigate to challenges screen
        break;
      case 'coaching_session':
        // Navigate to life coach screen
        break;
      default:
        // Navigate to home
        break;
    }
  }

  void _onNotificationTap(NotificationResponse response) {
    _notificationLog('🔔 Notification tapped: ${response.payload}');
    // Handle navigation based on payload
  }

  Future<void> _showLocalNotification(
    String title,
    String body,
    Map<String, dynamic> data,
  ) async {
    const AndroidNotificationDetails androidDetails =
        AndroidNotificationDetails(
      'twinmind_high_importance',
      'TwinGenie Notifications',
      channelDescription: 'Important notifications from your AI Twin',
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
      color: Color(0xFF9333EA),
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
      DateTime.now().millisecondsSinceEpoch.remainder(100000),
      title,
      body,
      details,
      payload: data.toString(),
    );
  }

  // ============ Public methods for showing notifications ============

  Future<void> showSmartReminder(String title, String message) async {
    await _showLocalNotification(
      title,
      message,
      {'type': 'smart_reminder'},
    );
  }

  Future<void> showProactiveMessage(String message) async {
    await _showLocalNotification(
      '💬 Message from your Twin',
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

  Future<void> showInsightReady() async {
    await _showLocalNotification(
      '📊 Your Weekly Insight is Ready',
      'See what your AI Twin learned about you this week',
      {'type': 'weekly_insight'},
    );
  }

  Future<void> showCoachingReminder(String programName) async {
    await _showLocalNotification(
      '🧘 Time for Coaching',
      'Continue your $programName session',
      {'type': 'coaching_session'},
    );
  }

  /// Subscribe to topic for broadcast notifications
  Future<void> subscribeToTopic(String topic) async {
    await _firebaseMessaging.subscribeToTopic(topic);
    _notificationLog('📢 Subscribed to topic: $topic');
  }

  /// Unsubscribe from topic
  Future<void> unsubscribeFromTopic(String topic) async {
    await _firebaseMessaging.unsubscribeFromTopic(topic);
    _notificationLog('📢 Unsubscribed from topic: $topic');
  }

  Future<void> _sendTokenToBackend(String token) async {
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) {
        print('ℹ️ Skipping FCM token sync until user signs in (session is null)');
        return;
      }
      print('Uploading token to backend: $token');
      await ApiService().updateFcmToken(token);
      print('✅ TOKEN UPLOAD HTTP SUCCESS');
    } catch (e) {
      print('❌ TOKEN UPLOAD HTTP ERROR: $e');
    }
  }
}
