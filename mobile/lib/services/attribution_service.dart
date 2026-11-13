import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AttributionService {
  static final AttributionService _instance = AttributionService._internal();
  factory AttributionService() => _instance;
  AttributionService._internal();

  static const MethodChannel _channel = MethodChannel('com.asmind.app/referral_channel');
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;

    _channel.setMethodCallHandler((call) async {
      if (call.method == 'onNewUri') {
        final uriString = call.arguments?.toString();
        if (uriString != null && uriString.isNotEmpty) {
          await _processIncomingUri(uriString);
        }
      }
    });

    try {
      final initialUri = await _channel.invokeMethod<String>('getInitialUri');
      if (initialUri != null && initialUri.isNotEmpty) {
        await _processIncomingUri(initialUri);
      }
    } catch (e) {
      if (kDebugMode) {
        print('Attribution channel initial URI check error: $e');
      }
    }
  }

  Future<void> _processIncomingUri(String rawUri) async {
    try {
      final uri = Uri.parse(rawUri);
      String? referralCode;

      // Check query parameters: ref, code, referrer
      referralCode = uri.queryParameters['ref'] ??
          uri.queryParameters['code'] ??
          uri.queryParameters['referrer'];

      // If not in query params, inspect path segments
      if (referralCode == null || referralCode.isEmpty) {
        final segments = uri.pathSegments;
        final refIndex = segments.indexWhere(
          (s) => s.toLowerCase() == 'referral' || s.toLowerCase() == 'signup',
        );
        if (refIndex != -1 && refIndex + 1 < segments.length) {
          referralCode = segments[refIndex + 1];
        }
      }

      if (referralCode != null && referralCode.trim().isNotEmpty) {
        final cleanCode = referralCode.trim().toUpperCase();
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('pending_referral_code', cleanCode);
        if (kDebugMode) {
          print('🎯 Attribution captured pending referral code: $cleanCode');
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error processing incoming URI for attribution: $e');
      }
    }
  }

  Future<String?> getPendingReferralCode() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString('pending_referral_code');
    } catch (_) {
      return null;
    }
  }

  Future<void> clearPendingReferralCode() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('pending_referral_code');
    } catch (_) {}
  }
}
