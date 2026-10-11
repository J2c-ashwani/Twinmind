import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/review_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _notificationsEnabled = true;
  bool _darkMode = true;
  bool _soundEnabled = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      extendBodyBehindAppBar: true,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0F0F1E), Color(0xFF1A0B2E), Color(0xFF0F0F1E)],
          ),
        ),
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              _buildSectionHeader('Preferences'),
              _buildSwitchTile(
                'Notifications',
                'Receive daily reminders and updates',
                _notificationsEnabled,
                (value) => setState(() => _notificationsEnabled = value),
                Icons.notifications_outlined,
              ),
              _buildSwitchTile(
                'Dark Mode',
                'Use dark theme across the app',
                _darkMode,
                (value) => setState(() => _darkMode = value),
                Icons.dark_mode_outlined,
              ),
              _buildSwitchTile(
                'Sound Effects',
                'Play sounds for messages and actions',
                _soundEnabled,
                (value) => setState(() => _soundEnabled = value),
                Icons.volume_up_outlined,
              ),
              const SizedBox(height: 32),
              _buildSectionHeader('Account'),
              _buildActionTile(
                'Personal Information',
                'Update your name and email',
                Icons.person_outline,
                () {},
              ),
              _buildActionTile(
                'Privacy & Security',
                'Manage your data and password',
                Icons.lock_outline,
                () {},
              ),
              _buildActionTile(
                'Subscription',
                'Manage your pro membership',
                Icons.credit_card_outlined,
                () => Navigator.pushNamed(context, '/subscription'),
              ),
              _buildActionTile(
                'Refer a Friend',
                'Invite friends and earn rewards',
                Icons.card_giftcard_outlined,
                () => Navigator.pushNamed(context, '/referral'),
              ),
              const SizedBox(height: 32),
              _buildSectionHeader('Data Management'),
              _buildActionTile(
                'Clear Chat History',
                'Delete all messages permanently',
                Icons.delete_outline,
                () => _showClearHistoryDialog(context),
                iconColor: Colors.red,
                textColor: Colors.red,
              ),
              const SizedBox(height: 32),
              _buildSectionHeader('Support & Feedback'),
              _buildActionTile(
                'Send Feedback & Ideas',
                'Share suggestions or report an issue directly with the founders',
                Icons.feedback_outlined,
                () => _showFeedbackDialog(context),
              ),
              _buildActionTile(
                'Rate on Google Play',
                'Leave an honest review to support TwinGenie',
                Icons.star_outline_rounded,
                () => ReviewService.openStoreListing(),
              ),
              _buildActionTile(
                'About TwinGenie',
                'Our mission and personal AI approach',
                Icons.info_outline,
                () => _showAboutDialog(context),
              ),
              const SizedBox(height: 32),
              _buildSectionHeader('Legal'),
              _buildActionTile(
                'Privacy Policy',
                'How we protect your data',
                Icons.privacy_tip_outlined,
                () => Navigator.pushNamed(context, '/privacy'),
              ),
              _buildActionTile(
                'Terms of Service',
                'Rules for using TwinGenie',
                Icons.description_outlined,
                () => Navigator.pushNamed(context, '/terms'),
              ),
              const SizedBox(height: 32),
              const Center(
                child: Text(
                  'Version 1.0.0',
                  style: TextStyle(color: Colors.white30),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Text(
        title,
        style: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: const Color(0xFF9333EA),
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _buildSwitchTile(
    String title,
    String subtitle,
    bool value,
    ValueChanged<bool> onChanged,
    IconData icon,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: SwitchListTile(
        value: value,
        onChanged: onChanged,
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
        ),
        secondary: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: Colors.white70, size: 20),
        ),
        activeThumbColor: const Color(0xFF9333EA),
      ),
    );
  }

  Widget _buildActionTile(
    String title,
    String subtitle,
    IconData icon,
    VoidCallback onTap, {
    Color? iconColor,
    Color? textColor,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: ListTile(
        onTap: onTap,
        title: Text(
          title,
          style: TextStyle(
            fontWeight: FontWeight.w500,
            color: textColor ?? Colors.white,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
        ),
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: iconColor ?? Colors.white70, size: 20),
        ),
        trailing: Icon(
          Icons.chevron_right,
          color: Colors.white.withOpacity(0.3),
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }

  Future<void> _showClearHistoryDialog(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1A0B2E),
        title:
            const Text('Clear History?', style: TextStyle(color: Colors.white)),
        content: const Text(
          'This will permanently delete all your chat messages. This action cannot be undone.',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Clear', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      try {
        final authService = Provider.of<AuthService>(context, listen: false);
        final token = authService.getAccessToken();

        if (token == null) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Please sign in to clear history')),
            );
          }
          return;
        }

        final api = ApiService();
        api.setToken(token);

        await api.clearChatHistory();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Chat history cleared')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to clear history: $e')),
          );
        }
      }
    }
  }

  void _showFeedbackDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A2E),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Send Feedback & Ideas',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'We read every single message from our community. Send your ideas, questions, or bug reports directly to our founding team:',
              style: TextStyle(color: Colors.white70, fontSize: 14),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.white12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.email_outlined, color: Color(0xFF818CF8), size: 20),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: SelectableText(
                      'support@twingenie.app',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Clipboard.setData(const ClipboardData(text: 'support@twingenie.app'));
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Email copied: support@twingenie.app'),
                  backgroundColor: Color(0xFF818CF8),
                ),
              );
            },
            child: const Text('Copy Email', style: TextStyle(color: Color(0xFF818CF8))),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close', style: TextStyle(color: Colors.white54)),
          ),
        ],
      ),
    );
  }

  void _showAboutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A2E),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'About TwinGenie',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'TwinGenie is your personal AI digital twin. Built with privacy and self-reflection at its core, it learns your values, goals, and cognitive style to help you navigate decisions with clarity.',
              style: TextStyle(color: Colors.white70, fontSize: 14, height: 1.4),
            ),
            SizedBox(height: 14),
            Text(
              'Your data is encrypted and never sold or used to train public models.',
              style: TextStyle(color: Colors.white54, fontSize: 13),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Got it', style: TextStyle(color: Color(0xFF818CF8))),
          ),
        ],
      ),
    );
  }
}
