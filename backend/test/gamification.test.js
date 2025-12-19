import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ACHIEVEMENTS } from '../src/services/gamificationService.js';

describe('Gamification Service Logic', () => {

    describe('Achievement Conditions', () => {

        it('should unlock "first_week" when active for 7 days', () => {
            const stats = { days_active: 7 };
            assert.strictEqual(ACHIEVEMENTS.first_week.condition(stats), true);
        });

        it('should NOT unlock "first_week" when active for 6 days', () => {
            const stats = { days_active: 6 };
            assert.strictEqual(ACHIEVEMENTS.first_week.condition(stats), false);
        });

        it('should unlock "trusted_companion" with 10 vulnerabilities', () => {
            const stats = { vulnerability_count: 10 };
            assert.strictEqual(ACHIEVEMENTS.trusted_companion.condition(stats), true);
        });

        it('should unlock "century_club" with 100 conversations', () => {
            const stats = { total_conversations: 100 };
            assert.strictEqual(ACHIEVEMENTS.century_club.condition(stats), true);
        });

        it('should unlock "legendary_bond" with 90 day streak', () => {
            const stats = { daily_streak: 90 };
            assert.strictEqual(ACHIEVEMENTS.legendary_bond.condition(stats), true);
        });

        it('should check all achievements have required properties', () => {
            for (const key in ACHIEVEMENTS) {
                const achievement = ACHIEVEMENTS[key];
                assert.ok(achievement.name, `Achievement ${key} missing name`);
                assert.ok(achievement.description, `Achievement ${key} missing description`);
                assert.ok(typeof achievement.condition === 'function', `Achievement ${key} missing condition`);
                assert.ok(achievement.points > 0, `Achievement ${key} points must be positive`);
            }
        });

    });
});
