import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { normalizeVoicePassword, normalizeVoiceUserId } from './voiceCredentialNormalization'

export type VoiceCredential = {
  userId: string
  passwordHash: string
  displayName?: string
}

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

const DEFAULT_VOICE_CREDENTIAL: VoiceCredential = {
  userId: 'tanmay09',
  passwordHash: '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5',
  displayName: 'Tanmay',
}


export function getVoiceCredentials(): VoiceCredential[] {
  const raw = process.env.EXAMSAARTHI_VOICE_USERS_JSON
  if (!raw) return [DEFAULT_VOICE_CREDENTIAL]

  try {
    const parsed = JSON.parse(raw)
    const entries = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object'
        ? [parsed]
        : []

    const valid = entries
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
      .map((entry) => ({
        userId: typeof entry.userId === 'string' ? normalizeVoiceUserId(entry.userId) : '',
        passwordHash: typeof entry.passwordHash === 'string' ? entry.passwordHash.trim().toLowerCase() : '',
        displayName: typeof entry.displayName === 'string' ? entry.displayName.trim().slice(0, 80) : undefined,
      }))
      .filter((entry) => /^[a-z0-9._-]{3,32}$/.test(entry.userId) && /^[a-f0-9]{64}$/.test(entry.passwordHash))

    return valid.length > 0 ? valid : [DEFAULT_VOICE_CREDENTIAL]
  } catch {
    return [DEFAULT_VOICE_CREDENTIAL]
  }
}

export function verifyVoiceCredentials(inputUserId: string, inputPassword: string) {
  const userId = normalizeVoiceUserId(inputUserId)
  const password = normalizeVoicePassword(inputPassword)
  if (!/^[a-z0-9._-]{3,32}$/.test(userId) || password.length < 1) return null

  const passwordHash = sha256(password)
  const hashBuffer = Buffer.from(passwordHash, 'hex')

  for (const credential of getVoiceCredentials()) {
    if (credential.userId !== userId) continue
    const expectedBuffer = Buffer.from(credential.passwordHash, 'hex')
    if (hashBuffer.length === expectedBuffer.length && timingSafeEqual(hashBuffer, expectedBuffer)) {
      return { ...credential, userId }
    }
  }

  return null
}

export function getVoiceAuthEmail(userId: string) {
  return `voice-${userId}@examsaarthi.app`
}

export function getInternalAuthPassword(userId: string) {
  const secret = process.env.EXAMSAARTHI_VOICE_INTERNAL_SECRET || 'examsaarthi-demo-internal-secret'
  return `${createHmac('sha256', secret).update(`voice-auth:${userId}`).digest('base64url')}Aa1!`
}

export function getSafeVoiceNextPath(next: string | null | undefined) {
  if (!next) return '/dashboard'
  try {
    const parsed = new URL(next, 'https://examsaarthi.local')
    if (parsed.origin !== 'https://examsaarthi.local') return '/dashboard'
    if (!parsed.pathname.startsWith('/') || parsed.pathname.startsWith('//')) return '/dashboard'
    return parsed.pathname + parsed.search + parsed.hash
  } catch {
    return '/dashboard'
  }
}
