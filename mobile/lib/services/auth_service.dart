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
      final response = await _supabase.auth.signUp(
        email: email,
        password: password,
        data: {'full_name': fullName},
      );
      
      if (response.user != null) {
        // Try to create/update user profile
        // The trigger might have already created it, so we ignore conflicts
        try {
          await _supabase.from('users').upsert({
            'id': response.user!.id,
            'full_name': fullName,
            'email': email,
          }, onConflict: 'id');
        } catch (upsertError) {
          // Ignore errors - if trigger already created the user, that's fine
          print('User profile creation (expected if trigger ran): $upsertError');
        }
      }
    } on AuthException catch (authError) {
      // Handle authentication-specific errors
      if (authError.message.contains('already registered') || 
          authError.message.contains('User already registered')) {
        throw 'This email is already registered. Please login instead.';
      }
      throw 'Sign up failed: ${authError.message}';
    } on PostgrestException catch (dbError) {
      // Handle database-specific errors
      if (dbError.code == '23505') {
        // Duplicate key error - account exists
        throw 'This email is already registered. Please login instead.';
      }
      throw 'Sign up failed: ${dbError.message}';
    } catch (e) {
      // Catch-all for unexpected errors
      final errorMessage = e.toString();
      if (errorMessage.contains('duplicate key') || errorMessage.contains('23505')) {
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
