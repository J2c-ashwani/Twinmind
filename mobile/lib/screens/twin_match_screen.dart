import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/api_service.dart';

class TwinMatchScreen extends StatefulWidget {
  const TwinMatchScreen({super.key});

  @override
  State<TwinMatchScreen> createState() => _TwinMatchScreenState();
}

class _TwinMatchScreenState extends State<TwinMatchScreen> {
  final _searchController = TextEditingController();
  bool _isLoading = false;
  Map<String, dynamic>? _matchResult;
  List<dynamic> _invitations = [];
  String? _statusMessage;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadInvitations();
  }

  Future<void> _loadInvitations() async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) return;
    try {
      final api = ApiService();
      api.setToken(session.accessToken);
      final invites = await api.getTwinMatchInvitations();
      if (mounted) {
        setState(() => _invitations = invites);
      }
    } catch (_) {}
  }

  Future<void> _handleSearch() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) return;

    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) {
      setState(() {
        _error = 'Please sign in to use Twin Match';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
      _statusMessage = null;
      _matchResult = null;
    });

    try {
      final api = ApiService();
      api.setToken(session.accessToken);

      try {
        final result = await api.compareTwins(query);
        setState(() {
          _matchResult = result;
        });
      } on HttpException catch (e) {
        if (e.statusCode == 403) {
          final inviteRes = await api.inviteTwinMatch(query);
          setState(() {
            _statusMessage = inviteRes['message'] ??
                'Consent invitation sent. Compatibility unlocks once accepted.';
          });
          await _loadInvitations();
        } else {
          rethrow;
        }
      }
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _respondInvite(String invitationId, bool accept) async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) return;
    setState(() => _isLoading = true);
    try {
      final api = ApiService();
      api.setToken(session.accessToken);
      if (accept) {
        final res = await api.acceptTwinMatchInvitation(invitationId);
        if (res['comparison'] is Map<String, dynamic>) {
          setState(() => _matchResult = res['comparison']);
        }
      } else {
        await api.declineTwinMatchInvitation(invitationId);
      }
      await _loadInvitations();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Twin Match'),
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
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Search Section
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Find a Twin',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _searchController,
                              style: const TextStyle(color: Colors.white),
                              decoration: InputDecoration(
                                hintText: 'Enter email or username...',
                                hintStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
                                filled: true,
                                fillColor: Colors.black.withOpacity(0.2),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(color: const Color(0xFF9333EA).withOpacity(0.5)),
                                ),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                              ),
                              onSubmitted: (_) => _handleSearch(),
                            ),
                          ),
                          const SizedBox(width: 12),
                          ElevatedButton(
                            onPressed: _isLoading ? null : _handleSearch,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF9333EA),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: _isLoading
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                    ),
                                  )
                                : const Icon(Icons.search),
                          ),
                        ],
                      ),
                      if (_statusMessage != null) ...[
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.green.withOpacity(0.3)),
                          ),
                          child: Text(
                            _statusMessage!,
                            style: TextStyle(color: Colors.green[200], fontSize: 14),
                          ),
                        ),
                      ],
                      if (_error != null) ...[
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.red.withOpacity(0.2)),
                          ),
                          child: Text(
                            _error!,
                            style: TextStyle(color: Colors.red[300], fontSize: 14),
                          ),
                        ),
                      ],
                      ..._invitations
                          .where((i) => i['direction'] == 'incoming' && i['status'] == 'pending')
                          .map((inv) => Padding(
                                padding: const EdgeInsets.only(top: 12),
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.06),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          '${inv['partner_twin_name'] ?? 'Friend'} invited you to Twin Match',
                                          style: const TextStyle(fontSize: 13),
                                        ),
                                      ),
                                      TextButton(
                                        onPressed: _isLoading
                                            ? null
                                            : () => _respondInvite(inv['id'].toString(), true),
                                        child: const Text('Accept'),
                                      ),
                                      TextButton(
                                        onPressed: _isLoading
                                            ? null
                                            : () => _respondInvite(inv['id'].toString(), false),
                                        child: const Text('Decline'),
                                      ),
                                    ],
                                  ),
                                ),
                              )),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Results Section
                if (_matchResult != null) _buildResultCard(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildResultCard() {
    final rawScore = _matchResult!['compatibility_score'] ?? _matchResult!['compatibility'] ?? 75;
    final score = rawScore is int
        ? rawScore
        : (double.tryParse(rawScore.toString())?.toInt() ?? 75);

    final rawShared = _matchResult!['shared_traits'] ?? _matchResult!['insights'] ?? [];
    final sharedTraits = (rawShared is List)
        ? rawShared.map((e) => e.toString()).toList()
        : <String>[];

    final rawDiffs = _matchResult!['differences'] ?? [];
    final differences = (rawDiffs is List)
        ? rawDiffs.map((e) => e.toString()).toList()
        : <String>[];

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF9333EA).withOpacity(0.2),
                  const Color(0xFFEC4899).withOpacity(0.2),
                ],
              ),
              border: Border.all(
                color: const Color(0xFF9333EA).withOpacity(0.3),
              ),
            ),
            child: Column(
              children: [
                Text(
                  '$score%',
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                Text(
                  'Compatibility',
                  style: TextStyle(
                    fontSize: 12,
                    color: const Color(0xFF9333EA).withOpacity(0.8),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            score > 80 ? "It's a Great Match!" : score > 50 ? "It's a Good Match!" : "Challenging Match",
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 24),
          
          // Shared Strengths
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Shared Strengths',
                  style: TextStyle(
                    color: Colors.greenAccent,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                ...sharedTraits.map((trait) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: Colors.greenAccent,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(trait),
                    ],
                  ),
                )),
              ],
            ),
          ),
          
          const SizedBox(height: 16),

          // Growth Areas
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Growth Areas',
                  style: TextStyle(
                    color: Colors.amberAccent,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                ...differences.map((diff) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: Colors.amberAccent,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(diff),
                    ],
                  ),
                )),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
