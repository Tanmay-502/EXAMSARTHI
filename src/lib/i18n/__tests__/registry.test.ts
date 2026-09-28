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
