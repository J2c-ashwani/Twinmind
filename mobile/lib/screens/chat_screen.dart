import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../models/chat_message.dart';
import 'package:emoji_picker_flutter/emoji_picker_flutter.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../widgets/voice_recorder_widget.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({Key? key}) : super(key: key);

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  
  List<ChatMessage> _messages = [];
  List<dynamic> _conversations = [];
  String? _currentConversationId;
  List<Map<String, dynamic>> _modes = [];
  String _currentMode = 'normal';
  String _twinName = 'Your Twin';
  bool _isLoading = false;
  late ApiService _api;
  
  // Voice & Emoji
  bool _showEmojiPicker = false;
  bool _showVoiceRecorder = false;
  bool _showModeDropdown = false;
  FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _initializeChat();
    
    // Check for conversation ID in route arguments (for deep linking)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      if (args != null && args['conversationId'] != null) {
        _selectConversation(args['conversationId']);
      }
    });
    
    _focusNode.addListener(() {
      if (_focusNode.hasFocus) {
        setState(() {
          _showEmojiPicker = false;
          _showVoiceRecorder = false;
        });
      }
    });
  }

  Future<void> _initializeChat() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    final token = authService.getAccessToken();
    
    if (token == null) {
      // No valid session - redirect to login
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/login');
      }
      return;
    }
    
    _api = ApiService();
    _api.setToken(token);
    
    try {
      // Load profile
      try {
        final profile = await _api.getPersonalityProfile();
        setState(() {
          _twinName = profile['personality']['twin_name'] ?? 'Your Twin';
        });
      } catch (e) {
        print('Profile load failed: $e');
      }
      
      // Load modes
      try {
        final modes = await _api.getModes();
        setState(() {
          _modes = List<Map<String, dynamic>>.from(modes);
        });
      } catch (e) {
        print('Modes load failed: $e');
        setState(() {
          _modes = [
            {
              'id': 'normal',
              'name': 'Normal Twin',
              'description': 'Your authentic digital twin',
              'available': true,
            },
            {
              'id': 'future',
              'name': 'Future Twin',
              'description': '5 years wiser',
              'available': true,
              'requiresPro': true,
            },
            {
              'id': 'dark',
              'name': 'Dark Twin',
              'description': 'Brutally honest',
              'available': true,
              'requiresPro': true,
            },
            {
              'id': 'therapist',
              'name': 'Therapist Twin',
              'description': 'Compassionate healing',
              'available': true,
            },
          ];
        });
      }
      
      await _loadConversations();
      
    } catch (e) {
      _showError(e.toString());
    }
  }

  Future<void> _loadConversations() async {
    try {
      final conversations = await _api.getConversations();
      setState(() {
        _conversations = conversations;
      });
      
      // Don't auto-select - start with empty chat
      // User can select from sidebar if they want to resume a conversation
    } catch (e) {
      print('Conversations load failed: $e');
    }
  }

  Future<void> _selectConversation(String id) async {
    try {
      setState(() {
        _currentConversationId = id;
        _isLoading = true;
      });
      
      // Update navigation to reflect conversation ID (web parity)
      // This enables shareable URLs and proper back navigation
      if (mounted) {
        // Note: Flutter web doesn't support pushReplacement with arguments easily
        // But we store the ID in state for session persistence
      }
      
      final response = await _api.getChatHistory(conversationId: id);
      final history = response['history'] ?? [];
      setState(() {
        _messages = (history as List).map((m) {
          // Parse JSON-encoded messages (legacy data fix)
          if (m['message'] is String) {
            String messageText = m['message'];
            if (messageText.trim().startsWith('{') && messageText.trim().endsWith('}')) {
              try {
                final parsed = json.decode(messageText);
                if (parsed['message'] != null) {
                  m['message'] = parsed['message'];
                }
              } catch (e) {
                // Not JSON, use as-is
              }
            }
          }
          return ChatMessage.fromJson(m);
        }).toList().cast<ChatMessage>();  // API returns [Oldest...Newest], perfect for reverse ListView
        _isLoading = false;
      });
      _scrollToBottom();
    } catch (e) {
      print('Messages load failed: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _createNewChat() async {
    // Don't create conversation in DB yet - wait for first message
    setState(() {
      _currentConversationId = null; // Clear conversation ID for new chat
      _messages = []; // Clear messages
    });
  }

  Future<void> _deleteConversation(String id) async {
    try {
      await _api.deleteConversation(id);
      setState(() {
        _conversations.removeWhere((c) => c['id'] == id);
      });
      
      if (_currentConversationId == id) {
        if (_conversations.isNotEmpty) {
          _selectConversation(_conversations[0]['id']);
        } else {
          _createNewChat();
        }
      }
    } catch (e) {
      _showError('Failed to delete chat');
    }
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      // Small delay to ensure list is rendered
      Future.delayed(const Duration(milliseconds: 100), () {
        _scrollController.animateTo(
          0.0, // Scroll to bottom (start of list in reverse mode)
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      });
    }
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty || _isLoading) return;
    
    final messageText = _messageController.text.trim();
    _messageController.clear();
    
    setState(() {
      _messages.insert(0, ChatMessage(
        id: DateTime.now().toString(),
        message: messageText,
        sender: 'user',
        mode: _currentMode,
        createdAt: DateTime.now(),
      ));
      _isLoading = true;
    });
    
    _scrollToBottom();
    
    try {
      final response = await _api.sendMessage(
        messageText, 
        _currentMode,
        conversationId: _currentConversationId,
      );
      
      // Update conversation ID from response (for new conversations)
      if (response['conversation_id'] != null && _currentConversationId != response['conversation_id']) {
        setState(() {
          _currentConversationId = response['conversation_id'];
        });
        // Reload conversations to update the sidebar
        await _loadConversations();
      }
      
      // Extract message text (handle both string and object responses) - matching web app logic
      var messageData = response['message'];
      String aiMessage = '';
      
      if (messageData is String) {
        aiMessage = messageData;
        // Check if it's a JSON string
        if (aiMessage.trim().startsWith('{') && aiMessage.trim().endsWith('}')) {
          try {
            final parsed = json.decode(aiMessage);
            if (parsed['message'] != null) {
              aiMessage = parsed['message'];
            }
          } catch (e) {
            // Not JSON, keep original string
          }
        }
      } else if (messageData is Map) {
        // Check for nested message.message (matching web app logic line 148-150)
        if (messageData['message'] != null) {
          aiMessage = messageData['message'] is String 
            ? messageData['message'] 
            : (messageData['message']['message'] ?? json.encode(messageData));
        } else {
          aiMessage = json.encode(messageData);
        }
      } else {
        aiMessage = messageData?.toString() ?? 'No response';
      }

      
      setState(() {
        _messages.insert(0, ChatMessage(
          id: (DateTime.now().millisecondsSinceEpoch + 1).toString(),
          message: aiMessage,
          sender: 'ai',
          mode: _currentMode,
          createdAt: DateTime.now(),  // Use current time like web app
        ));
        _isLoading = false;
      });
      
      _scrollToBottom();
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      _showError(e.toString());
    }
  }

  void _toggleVoiceRecorder() {
    setState(() {
      _showVoiceRecorder = !_showVoiceRecorder;
      if (_showVoiceRecorder) {
        _showEmojiPicker = false;
        _focusNode.unfocus();
      }
    });
  }

  Future<void> _handleVoiceSend(File audioFile, int duration) async {
    setState(() {
      _showVoiceRecorder = false;
    });
    // TODO: Implement voice upload
    _showError('Voice messages coming soon! (Duration: ${duration}s)');
  }

  void _onEmojiSelected(Category? category, Emoji emoji) {
    _messageController.text += emoji.emoji;
  }

  void _onBackspacePressed() {
    _messageController
      ..text = _messageController.text.characters.skipLast(1).toString()
      ..selection = TextSelection.fromPosition(
        TextPosition(offset: _messageController.text.length),
      );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: _buildDrawer(),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0F0F1E), Color(0xFF1A0B2E), Color(0xFF0F0F1E)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.2)),
                ),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => _scaffoldKey.currentState?.openDrawer(),
                      icon: const Icon(Icons.menu),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: InkWell(
                        onTap: () {
                          setState(() {
                            _showModeDropdown = !_showModeDropdown;
                          });
                        },
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _twinName,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Row(
                              children: [
                                Text(
                                  _modes.firstWhere(
                                    (m) => m['id'] == _currentMode,
                                    orElse: () => {'name': 'Normal Twin'}
                                  )['name'] ?? 'Normal Twin',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.white.withOpacity(0.6),
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Icon(
                                  _showModeDropdown ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                  size: 16,
                                  color: Colors.white.withOpacity(0.6),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pushNamed(context, '/profile'),
                      icon: const Icon(Icons.person_outline),
                    ),
                  ],
                ),
              ),
              
              // Mode dropdown
              if (_showModeDropdown)
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1A1A2E),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: Column(
                    children: _modes.map((mode) {
                      final isSelected = mode['id'] == _currentMode;
                      final isAvailable = mode['available'] == true;
                      final requiresPro = mode['requiresPro'] == true;
                      
                      return InkWell(
                        onTap: isAvailable ? () {
                          setState(() {
                            _currentMode = mode['id'];
                            _showModeDropdown = false;
                          });
                        } : null,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            border: Border(
                              bottom: BorderSide(
                                color: Colors.white.withOpacity(0.05),
                                width: 1,
                              ),
                            ),
                          ),
                          child: Row(
                            children: [
                              if (isSelected)
                                const Icon(Icons.check, color: Color(0xFF9333EA), size: 20)
                              else
                                const SizedBox(width: 20),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      mode['name'],
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                                        color: isAvailable ? Colors.white : Colors.white.withOpacity(0.4),
                                      ),
                                    ),
                                    if (mode['description'] != null)
                                      Text(
                                        mode['description'],
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.white.withOpacity(0.5),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              
              // Messages
              Expanded(
                child: _messages.isEmpty && !_isLoading
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.05),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.chat_bubble_outline, size: 48, color: Colors.white54),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Start a new conversation',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 18,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Your twin is ready to chat',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.4),
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      reverse: true,  // Start from bottom
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16),
                      itemCount: _messages.length + (_isLoading ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index >= _messages.length) {
                          return _buildLoadingBubble();
                        }
                        
                        final message = _messages[index];
                        return _buildMessageBubble(message);
                      },
                    ),
              ),
              
              // Voice Recorder
              if (_showVoiceRecorder)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: VoiceRecorderWidget(
                    onSend: _handleVoiceSend,
                    onCancel: () => setState(() => _showVoiceRecorder = false),
                  ),
                ),
              
              // Input
              Container(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(25),
                        border: Border.all(color: Colors.white.withOpacity(0.2)),
                      ),
                      child: Row(
                        children: [
                          IconButton(
                            icon: Icon(
                              _showEmojiPicker ? Icons.keyboard : Icons.emoji_emotions_outlined,
                              color: Colors.white70,
                            ),
                            onPressed: () {
                              setState(() {
                                _showEmojiPicker = !_showEmojiPicker;
                                if (_showEmojiPicker) {
                                  _focusNode.unfocus();
                                } else {
                                  _focusNode.requestFocus();
                                }
                              });
                            },
                          ),
                          Expanded(
                            child: TextField(
                              controller: _messageController,
                              focusNode: _focusNode,
                              decoration: const InputDecoration(
                                hintText: 'Message your twin...',
                                border: InputBorder.none,
                              ),
                              maxLines: null,
                            ),
                          ),
                          if (_messageController.text.isEmpty)
                            IconButton(
                              onPressed: _toggleVoiceRecorder,
                              icon: Icon(
                                _showVoiceRecorder ? Icons.close : Icons.mic,
                                color: _showVoiceRecorder ? Colors.red : Colors.white70,
                              ),
                            ),
                          IconButton(
                            onPressed: _sendMessage,
                            icon: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: const BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [Color(0xFF9333EA), Color(0xFF3B82F6)],
                                ),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.send, 
                                size: 20,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (_showEmojiPicker)
                      SizedBox(
                        height: 250,
                        child: EmojiPicker(
                          onEmojiSelected: _onEmojiSelected,
                          onBackspacePressed: _onBackspacePressed,
                          config: Config(
                            columns: 7,
                            emojiSizeMax: 32,
                            verticalSpacing: 0,
                            horizontalSpacing: 0,
                            gridPadding: EdgeInsets.zero,
                            initCategory: Category.RECENT,
                            bgColor: const Color(0xFF0F0F1E),
                            indicatorColor: const Color(0xFF9333EA),
                            iconColor: Colors.grey,
                            iconColorSelected: const Color(0xFF9333EA),
                            backspaceColor: const Color(0xFF9333EA),
                            skinToneDialogBgColor: Colors.white,
                            skinToneIndicatorColor: Colors.grey,
                            enableSkinTones: true,
                            recentsLimit: 28,
                            noRecents: const Text(
                              'No Recents',
                              style: TextStyle(fontSize: 20, color: Colors.black26),
                              textAlign: TextAlign.center,
                            ),
                            tabIndicatorAnimDuration: kTabScrollDuration,
                            categoryIcons: const CategoryIcons(),
                            buttonMode: ButtonMode.MATERIAL,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDrawer() {
    return Drawer(
      backgroundColor: const Color(0xFF1A0B2E),
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  const Icon(Icons.history, color: Colors.white),
                  const SizedBox(width: 12),
                  const Text(
                    'History',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context); // Close drawer
                  _createNewChat();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF9333EA),
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 45),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.add, color: Colors.white),
                    SizedBox(width: 8),
                    Text(
                      'New Chat',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.builder(
                itemCount: _conversations.length,
                itemBuilder: (context, index) {
                  final conv = _conversations[index];
                  final isSelected = conv['id'] == _currentConversationId;
                  
                  return ListTile(
                    selected: isSelected,
                    selectedTileColor: Colors.white.withOpacity(0.1),
                    leading: const Icon(Icons.chat_bubble_outline, color: Colors.white70),
                    title: Text(
                      conv['title'] ?? 'New Chat',
                      style: TextStyle(
                        color: isSelected ? Colors.white : Colors.white70,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.white30, size: 20),
                      onPressed: () => _deleteConversation(conv['id']),
                    ),
                    onTap: () {
                      Navigator.pop(context); // Close drawer
                      _selectConversation(conv['id']);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessage message) {
    final isUser = message.sender == 'user';
    
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(bottom: 4),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.75,
            ),
            decoration: BoxDecoration(
              gradient: isUser
                  ? const LinearGradient(
                      colors: [Color(0xFF9333EA), Color(0xFFEC4899)], // Purple to Pink match
                    )
                  : null,
              color: isUser ? null : Colors.white, // White background for AI
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(20),
                topRight: const Radius.circular(20),
                bottomLeft: Radius.circular(isUser ? 20 : 4),
                bottomRight: Radius.circular(isUser ? 4 : 20),
              ),
              boxShadow: isUser ? [] : [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 5,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: MarkdownBody(
              data: message.message,
              styleSheet: MarkdownStyleSheet(
                p: TextStyle(
                  fontSize: 16, 
                  color: isUser ? Colors.white : Colors.black87, // Dark text for AI
                  height: 1.4,
                ),
                code: TextStyle(
                  backgroundColor: isUser ? Colors.black.withOpacity(0.2) : Colors.grey[200],
                  color: isUser ? Colors.white : Colors.purple,
                  fontFamily: 'monospace',
                ),
                codeblockDecoration: BoxDecoration(
                  color: isUser ? Colors.black.withOpacity(0.2) : Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(bottom: 12, left: 4, right: 4),
            child: Text(
              _formatTime(message.createdAt),
              style: TextStyle(
                fontSize: 10,
                color: Colors.white.withOpacity(0.4),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingBubble() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
            bottomLeft: Radius.circular(4),
            bottomRight: Radius.circular(20),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 5,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildDot(0),
            const SizedBox(width: 4),
            _buildDot(1),
            const SizedBox(width: 4),
            _buildDot(2),
          ],
        ),
      ),
    );
  }

  Widget _buildDot(int index) {
    return Container(
      width: 8,
      height: 8,
      decoration: const BoxDecoration(
        color: Colors.grey,
        shape: BoxShape.circle,
      ),
    );
  }

  String _formatTime(DateTime time) {
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }
}

