// Stub file for web - NotificationService is not supported on web
class NotificationService {
  String? get fcmToken => null;
  
  Future<void> initialize() async {
    print('🌐 NotificationService: Web platform - notifications not supported');
  }
}
