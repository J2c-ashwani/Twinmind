import 'package:flutter/widgets.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService extends ChangeNotifier with WidgetsBindingObserver {
  final _supabase = Supabase.instance.client;
  
  User? get currentUser => _supabase.auth.currentUser;
  bool get isAuthenticated => currentUser != null;
  Session? get currentSession => _supabase.auth.currentSession;
  
  AuthService() {
    // Register lifecycle observer to handle app resume
    WidgetsBinding.instance.addObserver(this);

    // Listen to auth state changes
    _supabase.auth.onAuthStateChange.listen((data) {
      notifyListeners();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _recoverSession();
    }
  }

  Future<void> _recoverSession() async {
    try {
      final session = currentSession;
      if (session != null) {
        // If token is expired or close to expiring (within 60s), force refresh
        if (session.isExpired || _isTokenNearExpiry(session.expiresAt)) {
          print('🔄 App Resumed: Refreshing stale session...');
          await _supabase.auth.refreshSession();
          print('✅ Session recovered');
        }
      }
    } catch (e) {
      print('⚠️ Session recovery failed: $e');
    }
  }

  bool _isTokenNearExpiry(int? expiresAt) {
    if (expiresAt == null) return false;
    final expiry = DateTime.fromMillisecondsSinceEpoch(expiresAt * 1000);
    // Refresh if expiring in less than 5 minutes
    return DateTime.now().add(const Duration(minutes: 5)).isAfter(expiry);
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
      
      if (response.user == null) {
        throw 'Signup failed: ${response.session?.user == null ? "No user returned" : "Unknown error"}';
      }
      
      // DEFENSIVE CHECK: Wait for database trigger to create profile
      // Trigger should complete in 10-50ms, but we poll for up to 2 seconds
      print('Verifying profile creation...');
      bool profileExists = false;
      
      for (int attempt = 0; attempt < 10; attempt++) {
        try {
          final result = await _supabase
              .from('users')
              .select('id')
              .eq('id', response.user!.id)
              .maybeSingle();
          
          if (result != null) {
            profileExists = true;
            print('✅ Profile verified (attempt ${attempt + 1})');
            break;
          }
        } catch (e) {
          // Ignore query errors, retry
          print('Profile check attempt ${attempt + 1} failed: $e');
        }
        
        // Wait before retry (exponential backoff)
        await Future.delayed(Duration(milliseconds: 200 * (attempt + 1)));
      }
      
      if (!profileExists) {
        // Profile creation failed - clean up auth account
        print('❌ Profile creation timeout - cleaning up auth account');
        await _supabase.auth.signOut();
        throw 'Profile creation failed. This may be a temporary issue. Please try again or contact support if the problem persists.';
      }
      
      print('✅ Signup complete - profile exists');
      
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
