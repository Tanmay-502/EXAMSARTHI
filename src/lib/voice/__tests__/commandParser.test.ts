import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { parseCommand } from '../commandParser';

describe('Voice Command Parser', () => {
  describe('English (en-IN)', () => {
    test('should parse SELECT_OPTION correctly', () => {
      assert.deepStrictEqual(parseCommand('option a', 'en-IN'), { type: 'SELECT_OPTION', index: 0 });
      assert.deepStrictEqual(parseCommand('answer b', 'en-IN'), { type: 'SELECT_OPTION', index: 1 });
      assert.deepStrictEqual(parseCommand('i choose c', 'en-IN'), { type: 'SELECT_OPTION', index: 2 });
      assert.deepStrictEqual(parseCommand('d is the correct answer', 'en-IN'), { type: 'SELECT_OPTION', index: 3 });
    });

    test('should parse Navigation commands', () => {
      assert.deepStrictEqual(parseCommand('next question', 'en-IN'), { type: 'NEXT' });
      assert.deepStrictEqual(parseCommand('go back', 'en-IN'), { type: 'BACK' });
      assert.deepStrictEqual(parseCommand('repeat that', 'en-IN'), { type: 'REPEAT' });
    });

    test('should parse JUMP_TO_QUESTION', () => {
      assert.deepStrictEqual(parseCommand('jump to question 5', 'en-IN'), { type: 'JUMP_TO_QUESTION', index: 4 });
      assert.deepStrictEqual(parseCommand('go to question 10', 'en-IN'), { type: 'JUMP_TO_QUESTION', index: 9 });
      assert.deepStrictEqual(parseCommand('question', 'en-IN'), { type: 'UNKNOWN' });
    });

    test('should parse Confirmation flows', () => {
      assert.deepStrictEqual(parseCommand('yes confirm it', 'en-IN'), { type: 'CONFIRM' });
      assert.deepStrictEqual(parseCommand('no change it', 'en-IN'), { type: 'CHANGE' });
    });

    test('should parse natural navigation phrases', () => {
      assert.deepStrictEqual(parseCommand('take me back to dashboard', 'en-IN'), { type: 'OPEN_DASHBOARD' });
      assert.deepStrictEqual(parseCommand('go to dashboard', 'en-IN'), { type: 'OPEN_DASHBOARD' });
      assert.deepStrictEqual(parseCommand('I want to give exam', 'en-IN'), { type: 'DASHBOARD_EXAM' });
    });

    test('should parse Review commands', () => {
      assert.deepStrictEqual(parseCommand('mark for review', 'en-IN'), { type: 'MARK_REVIEW' });
      assert.deepStrictEqual(parseCommand('unmark it', 'en-IN'), { type: 'REMOVE_REVIEW' });
      assert.deepStrictEqual(parseCommand('review unanswered', 'en-IN'), { type: 'REVIEW_UNANSWERED' });
      assert.deepStrictEqual(parseCommand('review marked', 'en-IN'), { type: 'REVIEW_MARKED' });
    });
  });

  describe('Hindi (hi-IN)', () => {
    test('should parse SELECT_OPTION', () => {
      assert.deepStrictEqual(parseCommand('विकल्प ए', 'hi-IN'), { type: 'SELECT_OPTION', index: 0 });
      assert.deepStrictEqual(parseCommand('ऑप्शन बी', 'hi-IN'), { type: 'SELECT_OPTION', index: 1 });
    });

    test('should parse Navigation commands', () => {
      assert.deepStrictEqual(parseCommand('अगला प्रश्न', 'hi-IN'), { type: 'NEXT' });
      assert.deepStrictEqual(parseCommand('पिछला', 'hi-IN'), { type: 'BACK' });
    });

    test('should parse Confirmation flows', () => {
      assert.deepStrictEqual(parseCommand('पुष्टि करें', 'hi-IN'), { type: 'CONFIRM' });
      assert.deepStrictEqual(parseCommand('नहीं', 'hi-IN'), { type: 'CHANGE' });
    });
  });

  describe('Telugu (te-IN)', () => {
    test('should parse SELECT_OPTION', () => {
      assert.deepStrictEqual(parseCommand('ఎంపిక ఏ', 'te-IN'), { type: 'SELECT_OPTION', index: 0 });
      assert.deepStrictEqual(parseCommand('జవాబు బి', 'te-IN'), { type: 'SELECT_OPTION', index: 1 });
    });

    test('should parse Confirmation flows', () => {
      assert.deepStrictEqual(parseCommand('నిర్ధారించు', 'te-IN'), { type: 'CONFIRM' });
      assert.deepStrictEqual(parseCommand('కాదు', 'te-IN'), { type: 'CHANGE' });
    });

    test('should parse Telugu mode and analysis fallbacks', () => {
      assert.deepStrictEqual(parseCommand('వాయిస్', 'te-IN'), { type: 'SELECT_MODE_VOICE' });
      assert.deepStrictEqual(parseCommand('స్టాండర్డ్', 'te-IN'), { type: 'SELECT_MODE_STANDARD' });
      assert.deepStrictEqual(parseCommand('విశ్లేషణ', 'te-IN'), { type: 'OPEN_ANALYSIS' });
      assert.deepStrictEqual(parseCommand('నా పనితీరు ఎలా ఉంది', 'te-IN'), { type: 'OPEN_ANALYSIS' });
    });
  });
});
