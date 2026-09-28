'use client'

export type AuthCode = 'sent' | 'invalid_email' | 'no_account' | 'send_failed' | 'link_invalid' | 'unauthenticated'

const MESSAGES: Record<AuthCode, Record<'en-IN' | 'hi-IN' | 'te-IN', string>> = {
  sent: {
    'en-IN': 'Check your email for the Magic Link.',
    'hi-IN': 'मैजिक लिंक के लिए अपना ईमेल देखें।',
    'te-IN': 'మ్యాజిక్ లింక్ కోసం మీ ఈమెయిల్ చూడండి.',
  },
  invalid_email: {
    'en-IN': 'Enter a valid email address and complete the required name field.',
    'hi-IN': 'मान्य ईमेल पता दर्ज करें और नाम भरें।',
    'te-IN': 'చెల్లుబాటు అయ్యే ఈమెయిల్ చిరునామా మరియు అవసరమైన పేరు నమోదు చేయండి.',
  },
  no_account: {
    'en-IN': 'No account was found for that email address.',
    'hi-IN': 'इस ईमेल पते के लिए कोई अकाउंट नहीं मिला।',
    'te-IN': 'ఈ ఈమెయిల్ చిరునామాకు ఖాతా కనుగొనబడలేదు.',
  },
  send_failed: {
    'en-IN': 'The authentication link could not be sent. Please try again.',
    'hi-IN': 'ऑथेंटिकेशन लिंक नहीं भेजा जा सका। कृपया फिर से कोशिश करें।',
    'te-IN': 'ఆథెంటికేషన్ లింక్ పంపలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  },
  link_invalid: {
    'en-IN': 'That authentication link is invalid or expired. Request a new one.',
    'hi-IN': 'यह ऑथेंटिकेशन लिंक अमान्य या समाप्त हो चुका है। नया लिंक मांगें।',
    'te-IN': 'ఆథెంటికేషన్ లింక్ చెల్లదు లేదా గడువు ముగిసింది. కొత్త లింక్‌ను అభ్యర్థించండి.',
  },
  unauthenticated: {
    'en-IN': 'You need to sign in before continuing.',
    'hi-IN': 'आगे बढ़ने से पहले आपको साइन इन करना होगा।',
    'te-IN': 'కొనసాగడానికి ముందు మీరు సైన్ ఇన్ చేయాలి.',
  },
}

export function getAuthMessage(code: string | null, lang: 'en-IN' | 'hi-IN' | 'te-IN') {
  if (!code || !(code in MESSAGES)) return null
  return MESSAGES[code as AuthCode][lang]
}