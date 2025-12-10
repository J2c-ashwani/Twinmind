import 'package:flutter/material.dart';
import 'package:twinmind/services/api_service.dart';
import 'package:twinmind/services/auth_service.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final ApiService _api = ApiService();
  final AuthService _auth = AuthService();
  final ScrollController _scrollController = ScrollController();
  
  int currentScreen = 1;
  final int totalScreens = 5;
  
  List<Question> questions = [];
  Map<int, QuestionAnswer> answers = {};
  Map<int, String> otherTextInputs = {};
  
  bool isLoading = false;
  bool isGenerating = false;

  @override
  void initState() {
    super.initState();
    _initializeAuth();
    _loadQuestions();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _initializeAuth() async {
    final token = _auth.currentSession?.accessToken;
    if (token != null) {
      _api.setToken(token);
    }
  }

  Future<void> _loadQuestions() async {
    try {
      final qs = await _api.getQuestions();
      setState(() {
        questions = qs.map((q) => Question.fromJson(q)).toList();
      });
    } catch (e) {
      _showError('Failed to load questions: $e');
    }
  }

  List<Question> get currentQuestions {
    return questions.where((q) => q.screenNumber == currentScreen).toList();
  }

  void _handleAnswer(int questionId, String selectedOption, {bool isOther = false}) {
    setState(() {
      answers[questionId] = QuestionAnswer(
        questionId: questionId,
        selectedOption: isOther ? 'Other' : selectedOption,
        answerText: isOther ? otherTextInputs[questionId] : null,
      );
    });
  }

  void _handleOtherText(int questionId, String text) {
    setState(() {
      otherTextInputs[questionId] = text;
      
      // Update answer if "Other" is already selected
      if (answers[questionId]?.selectedOption == 'Other') {
        answers[questionId] = QuestionAnswer(
          questionId: questionId,
          selectedOption: 'Other',
          answerText: text,
        );
      }
    });
  }

  void _handleTextAnswer(int questionId, String text) {
    setState(() {
      answers[questionId] = QuestionAnswer(
        questionId: questionId,
        selectedOption: 'text', // Per spec: text questions store with selected="text"
        answerText: text,
      );
    });
  }

  bool _canProgress() {
    return currentQuestions.every((q) {
      final answer = answers[q.id];
      if (answer == null) return false;
      
      if (q.questionType == 'text') {
        // For text questions: require text input
        return answer.answerText != null && answer.answerText!.trim().isNotEmpty;
      }
      
      // For single_choice questions
      if (answer.selectedOption == null) return false;
      
      // If "Other" is selected, require text input
      if (answer.selectedOption == 'Other') {
        return answer.answerText != null && answer.answerText!.trim().isNotEmpty;
      }
      
      // Default options: immediately valid
      return true;
    });
  }

  Future<void> _handleNext() async {
    if (currentScreen < totalScreens) {
      setState(() {
        currentScreen++;
      });
      // Scroll to top of next screen
      _scrollController.animateTo(
        0.0,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    } else {
      await _handleSubmit();
    }
  }

  void _handleBack() {
    if (currentScreen > 1) {
      setState(() {
        currentScreen--;
      });
    }
  }

  Future<void> _handleSubmit() async {
    setState(() {
      isLoading = true;
      isGenerating = true;
    });

    try {
      final token = _auth.currentSession?.accessToken;
      if (token == null) {
        throw Exception('Not authenticated');
      }

      // Format answers for API
      final formattedAnswers = answers.values.map((a) => {
        'question_id': a.questionId,
        if (a.selectedOption != null) 'selected_option': a.selectedOption,
        if (a.answerText != null) 'answer_text': a.answerText,
      }).toList();

      // Submit answers
      await _api.submitAnswers(formattedAnswers, token);

      // Generate personality
      await _api.generatePersonality(token);

      // Navigate to home (main screen with chat)
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/home');
      }
    } catch (e) {
      setState(() {
        isGenerating = false;
      });
      _showError('Failed to create your twin: $e');
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red[700]),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (questions.isEmpty) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (isGenerating) {
      return Scaffold(
        body: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0xFF1A0B2E), Color(0xFF0F0F1E)],
            ),
          ),
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 120,
                  height: 120,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [Color(0xFF9333EA), Color(0xFF3B82F6)],
                    ),
                  ),
                  child: const Center(
                    child: Icon(Icons.psychology, size: 60, color: Colors.white),
                  ),
                ),
                const SizedBox(height: 32),
                const Text(
                  'Building Your Digital Mind...',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 32),
                  child: Text(
                    'Our AI is analyzing your personality and creating your unique digital twin.',
                    style: TextStyle(color: Colors.white70),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final progress = currentScreen / totalScreens;

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF1A0B2E), Color(0xFF0F0F1E)],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              children: [
                // Progress
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Screen $currentScreen of $totalScreens',
                            style: const TextStyle(color: Colors.white70)),
                        Text('${(progress * 100).round()}% complete',
                            style: const TextStyle(color: Colors.white70)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(
                      value: progress,
                      backgroundColor: Colors.white.withOpacity(0.1),
                      valueColor: const AlwaysStoppedAnimation<Color>(
                        Color(0xFF9333EA),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 32),

                // Questions
                Expanded(
                  child: SingleChildScrollView(
                    controller: _scrollController,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Tell us about yourself',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 24),
                        ...currentQuestions.map((q) => _buildQuestion(q)),
                      ],
                    ),
                  ),
                ),

                // Navigation
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    if (currentScreen > 1)
                      OutlinedButton.icon(
                        onPressed: _handleBack,
                        icon: const Icon(Icons.chevron_left),
                        label: const Text('Back'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: const BorderSide(color: Colors.white30),
                        ),
                      )
                    else
                      const SizedBox(width: 100),
                    
                    ElevatedButton(
                      onPressed: _canProgress() && !isLoading ? _handleNext : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF9333EA),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 32,
                          vertical: 16,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (isLoading)
                            const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          else
                            Text(
                              currentScreen == totalScreens
                                  ? 'Create My Twin'
                                  : 'Next',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          if (!isLoading && currentScreen < totalScreens)
                            const Icon(Icons.chevron_right, color: Colors.white),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildQuestion(Question q) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 32.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            q.questionText,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 12),
          
          if (q.questionType == 'text')
            TextField(
              onChanged: (text) => _handleTextAnswer(q.id, text),
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Share your thoughts...',
                filled: true,
                fillColor: Colors.white.withOpacity(0.05),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF9333EA), width: 2),
                ),
              ),
            )
          else
            Column(
              children: [
                ...q.options!.map((option) => _buildRadioOption(q.id, option)),
                if (q.allowOther)
                  Column(
                    children: [
                      _buildRadioOption(q.id, 'Other'),
                      if (answers[q.id]?.selectedOption == 'Other')
                        Padding(
                          padding: const EdgeInsets.only(left: 32, top: 8),
                          child: TextField(
                            onChanged: (text) => _handleOtherText(q.id, text),
                            decoration: InputDecoration(
                              hintText: 'Please specify...',
                              filled: true,
                              fillColor: Colors.white.withOpacity(0.05),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildRadioOption(int questionId, String option) {
    final isSelected = answers[questionId]?.selectedOption == option;
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: InkWell(
        onTap: () => _handleAnswer(questionId, option,
            isOther: option == 'Other'),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isSelected
                ? const Color(0xFF9333EA).withOpacity(0.1)
                : Colors.white.withOpacity(0.05),
            border: Border.all(
              color: isSelected
                  ? const Color(0xFF9333EA)
                  : Colors.white.withOpacity(0.2),
              width: 2,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Radio<String>(
                value: option,
                groupValue: answers[questionId]?.selectedOption,
                onChanged: (value) =>
                    _handleAnswer(questionId, value!, isOther: value == 'Other'),
                activeColor: const Color(0xFF9333EA),
              ),
              Expanded(
                child: Text(
                  option,
                  style: const TextStyle(fontSize: 16),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Models
class Question {
  final int id;
  final String questionText;
  final String questionType;
  final List<String>? options;
  final int screenNumber;
  final bool allowOther;

  Question({
    required this.id,
    required this.questionText,
    required this.questionType,
    this.options,
    required this.screenNumber,
    required this.allowOther,
  });

  factory Question.fromJson(Map<String, dynamic> json) {
    return Question(
      id: json['id'],
      questionText: json['question_text'],
      questionType: json['question_type'] ?? 'single_choice',
      options: json['options_json'] != null
          ? List<String>.from(json['options_json'])
          : null,
      screenNumber: json['screen_number'] ?? 1,
      allowOther: json['allow_other'] ?? true,
    );
  }
}

class QuestionAnswer {
  final int questionId;
  final String? selectedOption;
  final String? answerText;

  QuestionAnswer({
    required this.questionId,
    this.selectedOption,
    this.answerText,
  });

  Map<String, dynamic> toJson() {
    return {
      'question_id': questionId,
      if (selectedOption != null) 'selected_option': selectedOption,
      if (answerText != null) 'answer_text': answerText,
    };
  }
}
