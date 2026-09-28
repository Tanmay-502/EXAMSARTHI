import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const read = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), 'utf8')

test.describe('Task B core regression invariants', () => {
  test('exam/practice context model separates lobby/setup from active state', () => {
    const registry = read('src/lib/voice/safeActionRegistry.ts')
    const navigation = read('src/lib/voice/navigationEscape.ts')
    const contextStore = read('src/lib/store/voiceContextStore.ts')

    for (const context of ['exam_lobby', 'exam_active', 'practice_setup', 'practice_active']) {
      expect(contextStore).toContain(context)
      expect(registry).toContain(context)
      expect(navigation).toContain(context)
    }

    expect(registry).toContain("OPEN_DASHBOARD")
    expect(navigation).toContain("practice_setup: new Set")
    expect(navigation).toContain("practice_active: new Set<SafeAction>()")
    expect(navigation).toContain("exam_active: new Set<SafeAction>()")
  })

  test('practice start intents are consumed inside ExamEngine', () => {
    const engine = read('src/components/exam/ExamEngine.tsx')
    expect(engine).toContain("case 'START_EXAM':")
    expect(engine).toContain("case 'START_PRACTICE':")
    expect(engine).toContain("case 'OPEN_EXAM':")
    expect(engine).toContain("case 'OPEN_PRACTICE':")
    expect(engine).toContain("if ((mode === 'exam' || mode === 'practice') && engineState === 'READY')")
  })

  test('global voice action registration uses a stable wrapper', () => {
    const assistant = read('src/components/voice/GlobalVoiceAssistant.tsx')
    expect(assistant).toContain('handlerRef.current = handler')
    expect(assistant).toContain('const stableHandler = React.useCallback')
    expect(assistant).toContain('registerHandler(stableHandler)')
    expect(assistant).toContain('unregisterHandler(stableHandler)')
    expect(assistant).not.toContain('[context, stableHandler]')
  })

  test('natural intent payloads are zod-validated and unsupported languages are ignored', () => {
    const schema = read('src/lib/voice/naturalIntentSchema.ts')
    const assistant = read('src/components/voice/GlobalVoiceAssistant.tsx')
    const i18n = read('src/lib/i18n/I18nProvider.tsx')
    expect(schema).toContain("z.enum(['en-IN', 'hi-IN', 'te-IN'])")
    expect(schema).toContain("z.number().int().min(0).max(3)")
    expect(schema).toContain("z.number().int().min(1).max(100)")
    expect(assistant).toContain('validateNaturalIntentPayload')
    expect(i18n).toContain("if (newLang !== 'en-IN' && newLang !== 'hi-IN' && newLang !== 'te-IN')")
  })

  test('command parser has contextual mode/analysis gates and STT homophones', () => {
    const parser = read('src/lib/voice/commandParser.ts')
    expect(parser).toContain("const contextualModeAnalysis = new Set(['mode_selection', 'onboarding', 'dashboard'])")
    expect(parser).toContain("'bee'")
    expect(parser).toContain("'sea'")
    expect(parser).toContain("'dee'")
    expect(parser).toContain("'to')")
    expect(parser).toContain("'too')")
    expect(parser).toContain("'tree'")
    expect(parser).toContain("'for')")
    expect(parser).toContain("wordCount <= 3")
  })

  test('dashboard startup uses the shared say helper instead of paired speech and live announcement', () => {
    const dashboard = read('src/app/dashboard/page.tsx')
    expect(dashboard).toContain("import { say } from '@/lib/voice/say'")
    expect(dashboard).toContain('say(`${announceMsg} ${greeting}`, interactionMode, speak, announce)')
    expect(dashboard).not.toContain('announce(announceMsg)')
  })
  test('timer uses the persisted server clock offset', () => {
    const engine = read('src/components/exam/ExamEngine.tsx')
    const store = read('src/lib/store/examStore.ts')
    expect(store).toContain('serverTimeOffsetMs')
    expect(engine).toContain('Date.now() + state.serverTimeOffsetMs')
    expect(engine).not.toContain('serverTimeOffsetRef')
  })

  test('user-requested repeat bypasses announcement dedupe', () => {
    const engine = read('src/components/exam/ExamEngine.tsx')
    const results = read('src/components/exam/ResultsAnnouncer.tsx')
    expect(engine).toContain("speak(announcement, { dedupe: false })")
    expect(results).toContain("speak(msg, { dedupe: false })")
  })

  test('voice provider warns when the requested locale has no installed voice', () => {
    const provider = read('src/lib/voice/VoiceProvider.tsx')
    expect(provider).toContain('No ${languageName} voice installed. Using the browser default voice.')
    expect(provider).toContain('} else {')
    expect(provider).toContain("announce(warning, 'assertive')")
  })

  test('timer and voice status do not use routine live updates; threshold alerts remain', () => {
    const engine = read('src/components/exam/ExamEngine.tsx')
    const status = read('src/components/voice/VoiceStatusIndicator.tsx')
    expect(engine).toContain("announce(tParams('time_remaining'")
    expect(status).toContain("aria-live={shouldAnnounce ? 'assertive' : 'off'}")
    expect(engine).not.toContain('aria-live="polite">\n                {timeRemainingStr}')
  })

  test('audit writes use the privileged helper and analytics use bounded chunks', () => {
    const audit = read('src/lib/audit/writeAudit.ts')
    const exam = read('src/app/exam/actions.ts')
    const dashboard = read('src/app/dashboard/actions.ts')
    const analysis = read('src/app/analysis/actions.ts')
    expect(audit).toContain('createAdminClient')
    expect(audit).toContain('writeAudit')
    expect(exam).not.toContain(".from('audit_logs').insert")
    expect(dashboard).toContain("import { chunk } from '@/lib/db/chunk'")
    expect(analysis).toContain("import { chunk } from '@/lib/db/chunk'")
    expect(dashboard).not.toContain('.or(filters.join')
    expect(analysis).not.toContain('.or(filters.join')
  })
})
