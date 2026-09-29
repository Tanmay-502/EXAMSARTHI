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


test('release core regression guards', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const root = process.cwd();
  /** Reads a repository-relative UTF-8 file for the release regression assertions. */
  const read = (relativePath: string) => fs.readFile(path.join(root, relativePath), 'utf8');

  const [actions, practice, exam, engine, settings, utils, workflow, packageJson, packageLock, login, welcome, dashboardActions] = await Promise.all([
    read('src/app/exam/actions.ts'),
    read('src/app/practice/page.tsx'),
    read('src/app/exam/page.tsx'),
    read('src/components/exam/ExamEngine.tsx'),
    read('src/app/settings/page.tsx'),
    read('src/lib/utils.ts'),
    read('.github/workflows/verify.yml'),
    read('package.json'),
    read('package-lock.json'),
    read('src/app/auth/login/page.tsx'),
    read('src/app/welcome/page.tsx'),
    read('src/app/dashboard/actions.ts'),
  ]);

  assert.match(actions, /return \{ id: existing\.id, userId: user\.id \};/);
  assert.match(actions, /if \(sameRoster\) return \{ id: existing\.id, userId: user\.id \};/);
  assert.match(actions, /return \{ id: raced\.id, userId: user\.id \};/);
  assert.match(actions, /if \(raced && sameRacedRoster\) return \{ id: raced\.id, userId: user\.id \};/);
  assert.match(actions, /onConflict: 'session_id,question_id'/);
  assert.match(actions, /export async function resolveSubject\(spokenText: string\)/);
  assert.match(actions, /const adminClient = await createAdminClient\(\)/);
  assert.match(practice, /import \{ resolveSubject \} from '@\/app\/exam\/actions';/);
  assert.match(dashboardActions, /^'use server'\n/);
  assert.match(practice, /interactionMode !== 'voice-first'/);
  assert.match(practice, /!isLoaded/);
  assert.match(exam, /if \(loading \|\| error \|\| exams\.length === 0 \|\| !modeLoaded\) return;/);
  assert.match(exam, /if \(!selectedExam && !hasSpokenWelcome\.current\)/);
  assert.match(exam, /if \(voiceMode === 'voice-first' && !isContinuous && !hasStartedVoiceRef\.current\)/);
  assert.match(engine, /sayMessage\(tParams\('time_remaining'/);
  assert.doesNotMatch(engine, /answers not yet synced/);
  assert.doesNotMatch(login, /'\{t\(/);
  assert.doesNotMatch(login, /"\/h2>|"\/span>/);
  assert.doesNotMatch(welcome, /'\{t\(/);
  const preferredModeHook = await read('src/lib/hooks/usePreferredMode.ts');
  assert.match(preferredModeHook, /select\('accessibility_prefs'\)/);
  assert.match(preferredModeHook, /profilePrefs\?\.preferred_mode/);
  assert.match(engine, /disabled=\{interactionMode !== 'voice-first'\}/);
  assert.match(settings, /updatePreferences\(\{ preferred_mode: newMode, preferred_lang: lang \}\)/);
  assert.match(utils, /twMerge\(clsx\(inputs\)\)/);
  assert.doesNotMatch(workflow, /run:\s*npm run test -- e2e\/voice-dock-layout\.spec\.ts/);
  assert.match(workflow, /run:\s*npm test\s*$/m);
  assert.doesNotMatch(workflow, /run:\s*npm run test -- e2e\/accessibility\.spec\.ts/);
  assert.match(workflow, /run:\s*npx tsx --test src\/lib\/i18n\/__tests__\/registry\.test\.ts/);
  const questionRosterRls = await read('supabase/migrations/00014_questions_roster_rls.sql');
  assert.match(questionRosterRls, /DROP POLICY IF EXISTS "Anyone can read questions"/);
  assert.match(questionRosterRls, /Candidates can read own active roster questions/);
  assert.match(questionRosterRls, /jsonb_array_elements_text/);

  const pkg = JSON.parse(packageJson);
  const lock = JSON.parse(packageLock);
  assert.equal(pkg.engines?.node, '>=22');
  assert.equal(pkg.dependencies?.cn, undefined);
  assert.equal(pkg.devDependencies?.shadcn, '^4.21.0');
  assert.equal(pkg.devDependencies?.['@types/canvas-confetti'], undefined);
  assert.equal(lock.packages['node_modules/cn'], undefined);
  assert.equal(lock.packages['node_modules/@types/canvas-confetti'], undefined);
  assert.equal(lock.packages[''].dependencies?.cn, undefined);
  assert.ok(lock.packages[''].devDependencies?.shadcn);
});
