import 'package:flutter/material.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Terms of Service'),
        backgroundColor: const Color(0xFF1A1A2E),
        elevation: 0,
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0F0F1E), Color(0xFF1A1A2E)],
          ),
        ),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            _buildSection('1. Acceptance of Terms', 
              'By accessing or using TwinMind, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.'),
            _buildSection('2. User Accounts', 
              'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.'),
            _buildSection('3. Acceptable Use', 
              'You agree not to use TwinMind to:\n\n• Violate any laws or regulations.\n• Infringe upon the rights of others.\n• Distribute malware or harmful code.\n• Harass, abuse, or harm others.'),
            _buildSection('4. Intellectual Property', 
              'The content, features, and functionality of TwinMind are owned by us and are protected by international copyright, trademark, and other intellectual property laws.'),
            _buildSection('5. Termination', 
              'We reserve the right to terminate or suspend your account immediately, without prior notice or liability, for any reason, including without limitation if you breach the Terms.'),
            _buildSection('6. Changes to Terms', 
              'We reserve the right to modify or replace these Terms at any time. We will provide notice of any significant changes.'),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(String title, String content) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            content,
            style: TextStyle(
              color: Colors.white.withOpacity(0.8),
              fontSize: 14,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }
}
