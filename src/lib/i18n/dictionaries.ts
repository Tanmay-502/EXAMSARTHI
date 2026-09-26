import { LANGUAGE_REGISTRY, Locale } from './registry';

export type Lang = Locale;

export const dictionaries = {
  'en-IN': LANGUAGE_REGISTRY['en-IN'].dictionary,
  'hi-IN': LANGUAGE_REGISTRY['hi-IN'].dictionary,
  'te-IN': LANGUAGE_REGISTRY['te-IN'].dictionary,
};
