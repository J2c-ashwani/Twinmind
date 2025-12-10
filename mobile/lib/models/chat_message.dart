class ChatMessage {
  final String id;
  final String message;
  final String sender; // 'user' or 'ai'
  final String mode;
  final DateTime createdAt;
  final String? audioUrl; // Optional audio URL for voice messages

  ChatMessage({
    required this.id,
    required this.message,
    required this.sender,
    required this.mode,
    required this.createdAt,
    this.audioUrl,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'],
      message: json['message'],
      sender: json['sender'],
      mode: json['mode'],
      createdAt: DateTime.parse(json['created_at']).toLocal(),
      audioUrl: json['audio_url'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'message': message,
      'sender': sender,
      'mode': mode,
      'created_at': createdAt.toIso8601String(),
      if (audioUrl != null) 'audio_url': audioUrl,
    };
  }
}
