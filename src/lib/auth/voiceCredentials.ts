import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export type VoiceCredential = {
  userId: string
  passwordHash: string
  displayName?: string
}

const DEFAULT_VOICE_CREDENTIAL: VoiceCredential = {
  userId: 'tanmay09',
  passwordHash: '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5',
  displayName: 'Tanmay',
}

const DIGIT_WORDS: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9',
  shunya: '0', ek: '1', do: '2', teen: '3', char: '4', chaar: '4', paanch: '5',
  chhe: '6', cheh: '6', saat: '7', aath: '8', nau: '9',
  'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पाँच': '5', 'पांच': '5',
  'छह': '6', 'छः': '6', 'सात': '7', 'आठ': '8', 'नौ': '9',
  'సున్నా': '0', 'ఒకటి': '1', 'రెండు': '2', 'మూడు': '3', 'నాలుగు': '4',
  'ఐదు': '5', 'ఆరు': '6', 'ఏడు': '7', 'ఎనిమిది': '8', 'తొమ్మిది': '9',
}

const USER_ID_PREFIX = /^(?:my\s+)?(?:user\s*id|userid|username)\s*(?:is|=|:)??\s*/i
const PASSWORD_PREFIX = /^(?:my\s+)?password\s*(?:is|=|:)??\s*/i

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function normalizeWordDigits(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => DIGIT_WORDS[token] ?? token)
    .join('')
}

export function normalizeVoiceUserId(input: string) {
  const stripped = input
    .trim()
    .replace(USER_ID_PREFIX, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-\s]/g, ' ')
  return normalizeWordDigits(stripped).replace(/\s+/g, '').slice(0, 32)
}

export function normalizeVoicePassword(input: string) {
  const stripped = input
    .trim()
    .replace(PASSWORD_PREFIX, '')
    .toLowerCase()
    .replace(/[.,!?;:]+/g, ' ')
  return normalizeWordDigits(stripped).replace(/\s+/g, '').slice(0, 128)
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
