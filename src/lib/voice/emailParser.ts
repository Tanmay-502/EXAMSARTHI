const NUMBER_WORDS: Record<string, string> = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9',
};

const SYMBOL_WORDS: Array<[RegExp, string]> = [
  [/at the rate/gi, '@'],
  [/at rate/gi, '@'],
  [/at/gi, '@'],
  [/dot/gi, '.'],
  [/point/gi, '.'],
  [/period/gi, '.'],
  [/underscore/gi, '_'],
  [/under score/gi, '_'],
  [/dash/gi, '-'],
  [/hyphen/gi, '-'],
  [/plus/gi, '+'],
];

const DOMAIN_ALIASES: Array<[RegExp, string]> = [
  [/(g\s*mail|gmail)/gi, 'gmail'],
  [/(yahoo)/gi, 'yahoo'],
  [/(outlook)/gi, 'outlook'],
  [/(hotmail)/gi, 'hotmail'],
  [/(proton\s*mail|protonmail)/gi, 'protonmail'],
];


function normalizeNumberWords(text: string): string {
  return text.replace(/\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/gi, word => NUMBER_WORDS[word.toLowerCase()]);
}

function normalizeSymbols(text: string): string {
  let result = text;
  for (const [pattern, replacement] of SYMBOL_WORDS) {
    result = result.replace(pattern, ` ${replacement} `);
  }
  return result;
}

function normalizeDomain(text: string): string {
  let result = text;
  for (const [pattern, replacement] of DOMAIN_ALIASES) {
    result = result.replace(pattern, replacement);
  }

  // Only normalize a TLD when it follows a known email domain so ordinary
  // words such as "in" in a person's name are never changed.
  result = result.replace(
    /\b(gmail|yahoo|outlook|hotmail|protonmail)\s+(com|in|org|net)\b/gi,
    '$1.$2'
  );
  return result;
}

export function normalizeSpokenEmail(transcript: string): string | null {
  if (!transcript.trim()) return null;

  let value = transcript
    .trim()
    .toLowerCase()
    .replace(/\b(my email is|my email|email address is|email address|email is|the email is)\b/gi, ' ')
    .replace(/[|,;:!?]/g, ' ');

  value = normalizeSymbols(value);
  value = normalizeNumberWords(value);
  value = normalizeDomain(value);

  value = value
    .replace(/\s*@\s*/g, '@')
    .replace(/\s*\.\s*/g, '.')
    .replace(/\s*([_+\-])\s*/g, '$1')
    .replace(/\s+/g, '');

  const match = value.match(/[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  if (!match) return null;

  const email = match[0].replace(/^\.+|\.+$/g, '');
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain || !domain.includes('.')) return null;
  if (localPart.length > 254 || email.length > 254) return null;
  return email;
}

export function formatEmailForSpeech(email: string): string {
  const [localPart, domain] = email.split('@');
  return `${localPart.split('').join(' ')} at ${domain.replace(/\./g, ' dot ')}`;
}
