import 'package:flutter_test/flutter_test.dart';
import 'package:twinmind/providers/daily_provider.dart';

void main() {
  group('DailyChallenge Model', () {
    test('fromJson parses correctly with all fields', () {
      final json = {
        'id': '123',
        'type': 'gratitude',
        'task': 'Say thanks',
        'reward': 50,
        'completed': true,
        'time_window': 'Morning',
      };

      final challenge = DailyChallenge.fromJson(json);

      expect(challenge.id, '123');
      expect(challenge.type, 'gratitude');
      expect(challenge.task, 'Say thanks');
      expect(challenge.reward, 50);
      expect(challenge.completed, true);
      expect(challenge.timeWindow, 'Morning');
    });

    test('fromJson handles null time_window', () {
      final json = {
        'id': '124',
        'type': 'meditation',
        'task': 'Breathe',
        'reward': 10,
        'completed': false,
        'time_window': null,
      };

      final challenge = DailyChallenge.fromJson(json);

      expect(challenge.timeWindow, null);
    });

    test('fromJson handles missing optional fields with defaults', () {
      final json = {
        'id': '125',
        // type missing
        // task missing
        // reward missing
        // completed missing
      };

      final challenge = DailyChallenge.fromJson(json);

      expect(challenge.type, '');
      expect(challenge.task, '');
      expect(challenge.reward, 0);
      expect(challenge.completed, false);
    });
  });
}
