import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  bool _isYearly = true;
  bool _isLoading = true;
  Map<String, dynamic>? _pricing;

  @override
  void initState() {
    super.initState();
    _fetchPricing();
  }

  Future<void> _fetchPricing() async {
    try {
      final data = await ApiService().getPricingPlans();
      if (mounted) {
        setState(() {
          _pricing = data['pricing'];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
      print('Error fetching pricing: $e');
    }
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
                
                // Free Plan
                _buildPlanCard(
                  title: 'Free',
                  subtitle: 'Get started with basics',
                  price: '\$0',
                  period: 'forever',
                  features: [
                    '✨ All 4 AI personality modes',
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
                
                // Premium Plan
                _buildPlanCard(
                  title: 'Premium',
                  subtitle: 'Unlock full potential',
                  price: _isLoading 
                      ? '...' 
                      : (_isYearly 
                          ? (_pricing?['yearly']?['display'] ?? '\$49') 
                          : (_pricing?['monthly']?['display'] ?? '\$9')),
                  period: _isYearly ? 'year' : 'month',
                  features: [
                    '🚀 Unlimited messages/day',
                    '✨ All 4 AI personality modes',
                    '🎤 Voice messages',
                    '⚡ Priority response speed',
                    '📊 Advanced insights',
                    '💜 Proactive check-ins',
                    '📈 Weekly reports',
                    '🎯 Priority support',
                  ],
                  buttonText: 'Upgrade to Premium',
                  onTap: () => _handleUpgrade(),
                  isPremium: true,
                  savingsText: _isYearly 
                      ? (_pricing != null 
                          ? '🎉 You save ${_pricing!['yearly']['savings']} with yearly billing' 
                          : '🎉 You save 40% with yearly billing') 
                      : null,
                ),
                
                const SizedBox(height: 32),
                
                // Trust Badges
                Text(
                  '💳 Secure payment • 🔒 Cancel anytime\n💯 30-day money-back guarantee',
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

  Widget _buildToggleButton(String label, bool isSelected, VoidCallback onTap, {String? badge}) {
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
                  color: isSelected ? Colors.white : Colors.white.withOpacity(0.6),
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
                      color: isPremium ? Colors.white.withOpacity(0.8) : Colors.white.withOpacity(0.6),
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
                    color: isPremium ? Colors.white.withOpacity(0.8) : Colors.white.withOpacity(0.6),
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
                          color: isPremium ? Colors.white : Colors.white.withOpacity(0.9),
                          fontWeight: feature.contains('Unlimited') || feature.contains('All 4')
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
                backgroundColor: isPremium
                    ? Colors.white
                    : Colors.white.withOpacity(0.1),
                foregroundColor: isPremium ? const Color(0xFF9333EA) : Colors.white.withOpacity(0.5),
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
                  color: isPremium ? const Color(0xFF9333EA) : Colors.white.withOpacity(0.5),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _handleUpgrade() {
    // TODO: Implement payment flow with Stripe
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A2E),
        title: const Text('Payment Integration'),
        content: const Text(
          'Payment integration with Stripe is coming soon!\n\nFor now, this is a demo version.',
          style: TextStyle(color: Colors.white70),
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
