import test from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGE_REGISTRY, type Locale } from '../registry';

const locales: Locale[] = ['en-IN', 'hi-IN', 'te-IN'];

test('all locale dictionaries have identical non-empty keys and no mixed Indic scripts', () => {
  const dictionaries = Object.fromEntries(
    locales.map((locale) => [locale, LANGUAGE_REGISTRY[locale].dictionary])
  ) as Record<Locale, Record<string, string>>;

  const expectedKeys = Object.keys(dictionaries['en-IN']).sort();

  for (const locale of locales) {
    const keys = Object.keys(dictionaries[locale]).sort();
    assert.deepEqual(keys, expectedKeys, `dictionary keys differ for ${locale}`);

    for (const [key, value] of Object.entries(dictionaries[locale])) {
      assert.equal(typeof value, 'string', `${locale}.${key} must be a string`);
      assert.notEqual(value.trim(), '', `${locale}.${key} must not be empty`);

      const hasDevanagari = /[\u0900-\u097F]/u.test(value);
      const hasTelugu = /[\u0C00-\u0C7F]/u.test(value);
      assert.equal(
        hasDevanagari && hasTelugu,
        false,
        `${locale}.${key} mixes Devanagari and Telugu characters`
      );
    }
  }
});


test('final Phase A/B/C audit guards remain enforced in source', async (t) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const root = process.cwd();

  const read = (relativePath: string) =>
    fs.readFile(path.join(root, relativePath), 'utf8');

  await t.test('core UI files do not reintroduce audited hardcoded strings', async () => {
    const sources = await Promise.all([
      read('src/app/exam/page.tsx'),
      read('src/app/practice/page.tsx'),
      read('src/app/results/ResultsPageContent.tsx'),
      read('src/app/settings/page.tsx'),
      read('src/components/exam/ExamEngine.tsx'),
      read('src/app/analysis/AnalysisPageContent.tsx'),
      read('src/app/history/HistoryPageContent.tsx'),
      read('src/components/voice/DemoGuide.tsx'),
      read('src/components/voice/VoiceOverlay.tsx'),
      read('src/components/voice/VoiceStatusIndicator.tsx'),
      read('src/components/voice/VoiceTranscript.tsx'),
    ]);
    const joined = sources.join('\n');
    assert.doesNotMatch(joined, /" selected\. It has "/);
    assert.doesNotMatch(joined, /"Starting " \+/);
    assert.doesNotMatch(joined, /View History/);
  });

  await t.test('global skip link and frozen roster guards remain present', async () => {
    const appShell = await read('src/components/layout/AppShell.tsx');
    const actions = await read('src/app/exam/actions.ts');
    assert.match(appShell, /href="#main-content"/);
    assert.match(appShell, /t\('skip_to_main'\)/);
    assert.match(actions, /Exam session has no frozen question roster/);
    assert.match(actions, /roster\.length === 0 \|\| !roster\.includes\(questionId\)/);
    assert.match(actions, /questionIds\.length === 0/);
  });
});
