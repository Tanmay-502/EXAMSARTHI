import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { extractFinalSpeechTranscript } from '../extractFinalSpeechTranscript';

describe('Speech recognition final-result extraction', () => {
  test('does not consume an interim result as if it were final', () => {
    const interim = {
      resultIndex: 0,
      results: [
        {
          isFinal: false,
          0: { transcript: 'go to dashboard', confidence: 0 },
        },
      ],
    };

    assert.deepStrictEqual(extractFinalSpeechTranscript(interim), {
      text: '',
      confidence: null,
    });
  });

  test('captures the same result when the browser later finalizes it', () => {
    const finalized = {
      resultIndex: 0,
      results: [
        {
          isFinal: true,
          0: { transcript: 'go to dashboard', confidence: 0.94 },
        },
      ],
    };

    assert.deepStrictEqual(extractFinalSpeechTranscript(finalized), {
      text: 'go to dashboard',
      confidence: 0.94,
    });
  });

  test('processes multiple finalized results starting at resultIndex', () => {
    const event = {
      resultIndex: 2,
      results: [
        { isFinal: true, 0: { transcript: 'already handled' } },
        { isFinal: true, 0: { transcript: 'also handled' } },
        { isFinal: true, 0: { transcript: 'next ' } },
        { isFinal: true, 0: { transcript: 'please continue', confidence: 0.88 } },
      ],
    };

    assert.deepStrictEqual(extractFinalSpeechTranscript(event), {
      text: 'next please continue',
      confidence: 0.88,
    });
  });
});
