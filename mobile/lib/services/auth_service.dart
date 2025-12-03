import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService extends ChangeNotifier {
  final _supabase = Supabase.instance.client;
  
  User? get currentUser => _supabase.auth.currentUser;
  bool get isAuthenticated => currentUser != null;
  Session? get currentSession => _supabase.auth.currentSession;
  
  AuthService() {
    // Listen to auth state changes
    _supabase.auth.onAuthStateChange.listen((data) {
      notifyListeners();
    });
  }
  
  Future<User?> signInWithEmail(String email, String password) async {
    try {
      final response = await _supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );
      return response.user;
    } catch (e) {
      throw 'Authentication failed: ${e.toString()}';
    }
  }
  
  Future<void> signUpWithEmail(String email, String password, String fullName) async {
    try {
      final response = await _supabase.auth.signUp(
        email: email,
        password: password,
        data: {'full_name': fullName},
      );
      
      if (response.user != null) {
        // Create user profile
        await _supabase.from('users').insert({
          'id': response.user!.id,
          'full_name': fullName,
          'email': email,
        });
      }
    } catch (e) {
      throw 'Sign up failed: ${e.toString()}';
    }
  }
  
  Future<void> signInWithGoogle() async {
    try {
      await _supabase.auth.signInWithOAuth(OAuthProvider.google);
    } catch (e) {
      throw 'Google sign in failed: ${e.toString()}';
    }
  }
  
  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }
  
  String? getAccessToken() {
    return _supabase.auth.currentSession?.accessToken;
  }
}
