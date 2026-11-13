import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../main.dart';
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
  String? _pendingRoute;

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
        'twingenie_channel_v1',
        'TwinGenie Notifications',
        description: 'Important notifications from your AI Twin',
        importance: Importance.max,
      );

      await _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // Handle when app is opened from notification (background -> foreground)
      FirebaseMessaging.onMessageOpenedApp.listen(_handleBackgroundMessage);

      // Handle cold-start notification launch (terminated -> opened)
      final initialMessage = await _firebaseMessaging.getInitialMessage();
      if (initialMessage != null) {
        _handleNotificationNavigation(initialMessage.data);
      }

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
      if (token == null) {
        _notificationLog('❌ FCM token is null');
        return;
      }
      _fcmToken = token;
      await _sendTokenToBackend(token);
    } catch (e) {
      _notificationLog('❌ FCM token acquisition error: $e');
    }
  }

  Future<void> deregisterDeviceToken(String? accessToken) async {
    try {
      if (accessToken == null || accessToken.isEmpty) return;
      final api = ApiService();
      api.setToken(accessToken);
      await api.deregisterFcmToken(token: _fcmToken);
      _notificationLog('✅ Push device token deregistered on sign out');
    } catch (e) {
      _notificationLog('⚠️ Push device token deregistration warning: $e');
    }
  }

  Future<void> _handleForegroundMessage(RemoteMessage message) async {
    _notificationLog('📩 Foreground message: ${message.notification?.title}');

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
    _handleNotificationNavigation(message.data);
  }

  String _resolveRoute(Map<String, dynamic> data) {
    final action = data['action']?.toString();
    final type = data['type']?.toString();
    if (action == 'chat') return '/chat';
    switch (type) {
      case 'proactive_message':
      case 'smart_reminder':
      case 'twin_ready_reminder':
      case 'drip_reengagement':
      case 'streak_reminder':
        return '/chat';
      case 'achievement':
        return '/achievements';
      case 'daily_challenge':
        return '/daily-challenges';
      case 'coaching_session':
        return '/life-coach';
      case 'weekly_insight':
        return '/insights';
      default:
        return '/notifications';
    }
  }

  void _navigateOrQueue(String route) {
    final nav = rootNavigatorKey.currentState;
    final session = Supabase.instance.client.auth.currentSession;
    if (nav != null && session != null) {
      nav.pushNamed(route);
    } else {
      _pendingRoute = route;
    }
  }

  void consumePendingNavigation() {
    final route = _pendingRoute;
    if (route == null) return;
    final nav = rootNavigatorKey.currentState;
    final session = Supabase.instance.client.auth.currentSession;
    if (nav != null && session != null) {
      _pendingRoute = null;
      nav.pushNamed(route);
    }
  }

  void _handleNotificationNavigation(Map<String, dynamic> data) {
    final route = _resolveRoute(data);
    _navigateOrQueue(route);
  }

  void _onNotificationTap(NotificationResponse response) {
    _notificationLog('🔔 Notification tapped');
    final rawPayload = response.payload;
    if (rawPayload == null || rawPayload.isEmpty) {
      _navigateOrQueue('/notifications');
      return;
    }
    try {
      final decoded = jsonDecode(rawPayload);
      if (decoded is Map<String, dynamic>) {
        _handleNotificationNavigation(decoded);
        return;
      }
    } catch (_) {
      // Fallback for non-JSON payload strings
    }
    _navigateOrQueue('/notifications');
  }

  Future<void> _showLocalNotification(
    String title,
    String body,
    Map<String, dynamic> data,
  ) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final notificationsEnabled = prefs.getBool('pref_notifications_enabled') ?? true;
      if (!notificationsEnabled) {
        _notificationLog('🔇 Local notification suppressed by user preference');
        return;
      }
      final soundEnabled = prefs.getBool('pref_sound_enabled') ?? true;

      final AndroidNotificationDetails androidDetails =
          AndroidNotificationDetails(
        'twingenie_channel_v1',
        'TwinGenie Notifications',
        channelDescription: 'Important notifications from your AI Twin',
        importance: Importance.max,
        priority: Priority.high,
        icon: '@drawable/ic_notification',
        largeIcon: const DrawableResourceAndroidBitmap('@mipmap/launcher_icon'),
        color: const Color(0xFF9333EA),
        playSound: soundEnabled,
        enableVibration: soundEnabled,
      );

      final DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: soundEnabled,
      );

      final NotificationDetails details = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      await _localNotifications.show(
        DateTime.now().millisecondsSinceEpoch.remainder(100000),
        title,
        body,
        details,
        payload: jsonEncode(data),
      );
    } catch (e) {
      _notificationLog('⚠️ Error showing local notification: $e');
    }
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
        _notificationLog('ℹ️ Skipping FCM token sync until user signs in');
        return;
      }
      _notificationLog('Uploading device token to backend...');
      await ApiService().updateFcmToken(token);
      _notificationLog('✅ Device token synced successfully');
    } catch (e) {
      _notificationLog('❌ Device token sync error: $e');
    }
  }
}
