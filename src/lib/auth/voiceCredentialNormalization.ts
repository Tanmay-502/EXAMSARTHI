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

const USER_ID_PREFIX = /^(?:my\s+)?(?:user\s*id|userid|username)\s*(?:is|=|:)?\s*/i
const PASSWORD_PREFIX = /^(?:my\s+)?password\s*(?:is|=|:)?\s*/i

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
