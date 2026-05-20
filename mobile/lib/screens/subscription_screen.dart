import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/api_service.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  static const String _monthlyProductId = 'premium_monthly';
  static const String _yearlyProductId = 'premium_yearly';

  bool _isYearly = true;
  bool _isLoading = true;
  bool _isStoreLoading = true;
  bool _isPurchasing = false;
  bool _storeAvailable = false;
  Map<String, dynamic>? _pricing;
  final InAppPurchase _inAppPurchase = InAppPurchase.instance;
  final ApiService _apiService = ApiService();
  late final StreamSubscription<List<PurchaseDetails>> _purchaseSubscription;
  final Map<String, ProductDetails> _products = {};
  final Set<String> _verifiedPurchaseTokens = {};

  @override
  void initState() {
    super.initState();
    _purchaseSubscription = _inAppPurchase.purchaseStream.listen(
      _handlePurchaseUpdates,
      onError: (error) {
        if (!mounted) return;
        setState(() => _isPurchasing = false);
        _showStoreMessage(
          'Purchase could not be completed',
          'Google Play returned an error. Please try again in a moment.',
        );
      },
    );
    _fetchPricing();
    _loadStoreProducts();
  }

  @override
  void dispose() {
    _purchaseSubscription.cancel();
    super.dispose();
  }

  Future<void> _fetchPricing() async {
    try {
      final data = await _apiService.getPricingPlans();
      if (mounted) {
        setState(() {
          _pricing = data['pricing'];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
      debugPrint('Error fetching pricing: $e');
    }
  }

  Future<void> _loadStoreProducts() async {
    try {
      final available = await _inAppPurchase.isAvailable();
      if (!available) {
        if (mounted) {
          setState(() {
            _storeAvailable = false;
            _isStoreLoading = false;
          });
        }
        return;
      }

      final response = await _inAppPurchase.queryProductDetails({
        _monthlyProductId,
        _yearlyProductId,
      });

      if (mounted) {
        setState(() {
          _storeAvailable = true;
          _isStoreLoading = false;
          _products
            ..clear()
            ..addEntries(response.productDetails
                .map((product) => MapEntry(product.id, product)));
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _storeAvailable = false;
          _isStoreLoading = false;
        });
      }
      debugPrint('Error loading Google Play products: $e');
    }
  }

  ProductDetails? get _selectedProduct =>
      _products[_isYearly ? _yearlyProductId : _monthlyProductId];

  String get _selectedPrice {
    final product = _selectedProduct;
    if (product != null) return product.price;
    if (_isLoading) return '...';
    return _isYearly
        ? (_pricing?['yearly']?['display'] ?? '\$49')
        : (_pricing?['monthly']?['display'] ?? '\$9');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0F1E),
      appBar: AppBar(
        title: const Text('Choose Your Plan'),
        backgroundColor: const Color(0xFF0F0F1E),
        elevation: 0,
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0F0F1E), Color(0xFF1A0B2E), Color(0xFF0F0F1E)],
          ),
        ),
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Billing Toggle
              Container(
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(30),
                ),
                padding: const EdgeInsets.all(4),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildToggleButton('Monthly', !_isYearly, () {
                      setState(() => _isYearly = false);
                    }),
                    _buildToggleButton('Yearly', _isYearly, () {
                      setState(() => _isYearly = true);
                    }, badge: 'Save 40%'),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              _buildPlanCard(
                title: 'Free',
                subtitle: 'Start reflecting without payment details',
                price: '\$0',
                period: 'forever',
                features: [
                  'All 4 AI personality modes',
                  '10 messages per day',
                  'Daily challenges',
                  'Mood tracking',
                  'Memory timeline',
                  'Achievements & streaks',
                ],
                buttonText: 'Current Plan',
                onTap: null,
                isCurrentPlan: true,
              ),

              const SizedBox(height: 24),

              _buildPlanCard(
                title: 'Premium',
                subtitle: 'Subscribed securely through Google Play',
                price: _selectedPrice,
                period: _isYearly ? 'year' : 'month',
                features: [
                  'Unlimited messages/day',
                  'All 4 AI personality modes',
                  'Voice messages',
                  'Priority response speed',
                  'Advanced insights',
                  'Proactive check-ins',
                  'Weekly reports',
                  'Priority support',
                ],
                buttonText: _isPurchasing
                    ? 'Opening Google Play...'
                    : (_isStoreLoading
                        ? 'Loading Google Play...'
                        : 'Continue with Google Play'),
                onTap: () => _handleUpgrade(),
                isPremium: true,
                savingsText: _isYearly
                    ? (_pricing != null
                        ? 'Save ${_pricing!['yearly']['savings']} with yearly billing'
                        : 'Save more with yearly billing')
                    : null,
              ),

              const SizedBox(height: 32),

              // Trust Badges
              Text(
                'Secure Google Play billing • Cancel anytime in Play Store',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.5),
                  fontSize: 12,
                ),
              ),

              const SizedBox(height: 24), // Extra bottom padding
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildToggleButton(String label, bool isSelected, VoidCallback onTap,
      {String? badge}) {
    return Expanded(
      child: Stack(
        children: [
          GestureDetector(
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
              decoration: BoxDecoration(
                gradient: isSelected
                    ? const LinearGradient(
                        colors: [Color(0xFF9333EA), Color(0xFF3B82F6)],
                      )
                    : null,
                borderRadius: BorderRadius.circular(25),
              ),
              child: Text(
                label,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color:
                      isSelected ? Colors.white : Colors.white.withOpacity(0.6),
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ),
          ),
          if (badge != null && isSelected)
            Positioned(
              top: -8,
              right: -8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.green,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  badge,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPlanCard({
    required String title,
    required String subtitle,
    required String price,
    required String period,
    required List<String> features,
    required String buttonText,
    required VoidCallback? onTap,
    bool isCurrentPlan = false,
    bool isPremium = false,
    String? savingsText,
  }) {
    return Container(
      decoration: BoxDecoration(
        gradient: isPremium
            ? const LinearGradient(
                colors: [Color(0xFF9333EA), Color(0xFF3B82F6)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : null,
        color: isPremium ? null : Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isPremium ? Colors.transparent : Colors.white.withOpacity(0.1),
          width: 2,
        ),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: isPremium ? Colors.white : Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: isPremium
                          ? Colors.white.withOpacity(0.8)
                          : Colors.white.withOpacity(0.6),
                    ),
                  ),
                ],
              ),
              if (isPremium)
                const Icon(Icons.auto_awesome, color: Colors.white, size: 28),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                price,
                style: GoogleFonts.inter(
                  fontSize: 48,
                  fontWeight: FontWeight.bold,
                  color: isPremium ? Colors.white : Colors.white,
                ),
              ),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  '/$period',
                  style: TextStyle(
                    color: isPremium
                        ? Colors.white.withOpacity(0.8)
                        : Colors.white.withOpacity(0.6),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          ...features.map((feature) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    Icon(
                      Icons.check_circle,
                      color: isPremium ? Colors.white : const Color(0xFF9333EA),
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        feature,
                        style: TextStyle(
                          color: isPremium
                              ? Colors.white
                              : Colors.white.withOpacity(0.9),
                          fontWeight: feature.contains('Unlimited') ||
                                  feature.contains('All 4')
                              ? FontWeight.bold
                              : FontWeight.normal,
                        ),
                      ),
                    ),
                  ],
                ),
              )),
          if (savingsText != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                savingsText,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                ),
              ),
            ),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onTap,
              style: ElevatedButton.styleFrom(
                backgroundColor:
                    isPremium ? Colors.white : Colors.white.withOpacity(0.1),
                foregroundColor: isPremium
                    ? const Color(0xFF9333EA)
                    : Colors.white.withOpacity(0.5),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: isPremium ? 8 : 0,
              ),
              child: Text(
                buttonText,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: isPremium
                      ? const Color(0xFF9333EA)
                      : Colors.white.withOpacity(0.5),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleUpgrade() async {
    if (_isStoreLoading || _isPurchasing) return;

    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) {
      _showSignInRequired();
      return;
    }

    if (!_storeAvailable) {
      _showStoreMessage(
        'Google Play unavailable',
        'Please open this screen from the Android app installed through Google Play.',
      );
      return;
    }

    final product = _selectedProduct;
    if (product == null) {
      _showStoreMessage(
        'Plan not ready in Google Play',
        'Create the product ID ${_isYearly ? _yearlyProductId : _monthlyProductId} in Play Console, then try again.',
      );
      return;
    }

    setState(() => _isPurchasing = true);

    final purchaseParam = PurchaseParam(
      productDetails: product,
      applicationUserName: session.user.id,
    );
    final started =
        await _inAppPurchase.buyNonConsumable(purchaseParam: purchaseParam);
    if (!started && mounted) {
      setState(() => _isPurchasing = false);
      _showStoreMessage(
        'Purchase not started',
        'Google Play did not open the checkout. Please try again.',
      );
    }
  }

  Future<void> _handlePurchaseUpdates(List<PurchaseDetails> purchases) async {
    for (final purchase in purchases) {
      if (!mounted) continue;

      switch (purchase.status) {
        case PurchaseStatus.pending:
          setState(() => _isPurchasing = true);
          break;
        case PurchaseStatus.purchased:
        case PurchaseStatus.restored:
          await _verifyAndActivatePurchase(purchase);
          break;
        case PurchaseStatus.error:
          setState(() => _isPurchasing = false);
          _showStoreMessage(
            'Purchase failed',
            purchase.error?.message ??
                'Google Play could not complete the purchase.',
          );
          break;
        case PurchaseStatus.canceled:
          setState(() => _isPurchasing = false);
          break;
      }
    }
  }

  Future<void> _verifyAndActivatePurchase(PurchaseDetails purchase) async {
    final purchaseToken = purchase.verificationData.serverVerificationData;
    if (purchaseToken.isEmpty) {
      setState(() => _isPurchasing = false);
      _showStoreMessage(
        'Purchase verification needed',
        'Google Play did not return a purchase token. Please restore or try again.',
      );
      return;
    }

    if (_verifiedPurchaseTokens.contains(purchaseToken)) {
      if (purchase.pendingCompletePurchase) {
        await _inAppPurchase.completePurchase(purchase);
      }
      return;
    }

    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) {
        throw Exception(
            'Please sign in again so we can connect Premium to your account.');
      }
      _apiService.setToken(session.accessToken);

      await _apiService.verifyGooglePlayPurchase(
        productId: purchase.productID,
        purchaseToken: purchaseToken,
      );

      _verifiedPurchaseTokens.add(purchaseToken);

      if (purchase.pendingCompletePurchase) {
        await _inAppPurchase.completePurchase(purchase);
      }

      if (!mounted) return;
      setState(() => _isPurchasing = false);
      _showStoreMessage(
        'Premium is active',
        'Your Google Play subscription is verified and connected to this TwinGenie account.',
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isPurchasing = false);
      _showStoreMessage(
        'Purchase needs verification',
        e.toString().replaceAll('Exception: ', ''),
      );
    }
  }

  void _showSignInRequired() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A2E),
        title: const Text(
          'Sign in to subscribe',
          style: TextStyle(color: Colors.white),
        ),
        content: const Text(
          'Create your TwinGenie account or sign in first. Then your Google Play subscription can be connected to the right profile.',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Not now'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pushNamed(context, '/login');
            },
            child: const Text('Sign in'),
          ),
        ],
      ),
    );
  }

  void _showStoreMessage(String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A2E),
        title: Text(
          title,
          style: const TextStyle(color: Colors.white),
        ),
        content: Text(
          message,
          style: const TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }
}
