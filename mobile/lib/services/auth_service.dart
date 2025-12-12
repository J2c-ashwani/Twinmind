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
  
  Future<AuthResponse> signInWithEmail(String email, String password) async {
    try {
      final response = await _supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );
      return response;
    } catch (e) {
      throw 'Authentication failed: ${e.toString()}';
    }
  }
  
  Future<void> signUpWithEmail(String email, String password, String fullName) async {
    try {
      // Sign up with Supabase Auth
      // Metadata is automatically passed to the database trigger
      final response = await _supabase.auth.signUp(
        email: email,
        password: password,
        data: {'full_name': fullName},  // Trigger uses this to create profile
      );
      
      // No need to manually create profile - the database trigger handles it!
      // Trigger: handle_new_user() in db_fix_rls.sql
      
      if (response.user == null) {
        throw 'Signup failed - no user returned';
      }
      
      // Profile will be created by trigger within 10-50ms
      // The onboarding flow will proceed regardless
      
    } on AuthException catch (authError) {
      // Handle Supabase auth errors
      if (authError.message.contains('already registered') || 
          authError.message.contains('User already registered')) {
        throw 'This email is already registered. Please login instead.';
      }
      throw 'Sign up failed: ${authError.message}';
    } catch (e) {
      // Catch unexpected errors
      final errorMessage = e.toString();
      if (errorMessage.contains('already registered')) {
        throw 'This email is already registered. Please login instead.';
      }
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
