import assert from 'node:assert/strict';
import { SUPPORTED_LANGUAGES, translations, getT } from '../src/i18n';

const referenceKeys = Object.keys(translations.fr).sort();
assert.ok(referenceKeys.length > 250, 'Reference French dictionary should contain all core and menu keys');

for (const lang of SUPPORTED_LANGUAGES) {
  const dict = translations[lang.code];
  assert.ok(dict, `Missing dictionary for locale ${lang.code}`);

  const localeKeys = Object.keys(dict).sort();

  const missingInLocale = referenceKeys.filter((k) => !(k in dict));
  const extraInLocale = localeKeys.filter((k) => !(k in translations.fr));

  assert.deepEqual(
    missingInLocale,
    [],
    `Locale "${lang.code}" is missing keys: ${missingInLocale.join(', ')}`
  );
  assert.deepEqual(
    extraInLocale,
    [],
    `Locale "${lang.code}" has orphaned keys not in reference: ${extraInLocale.join(', ')}`
  );

  for (const key of localeKeys) {
    const val = (dict as Record<string, string>)[key];
    assert.equal(typeof val, 'string', `Key "${key}" in locale "${lang.code}" must be a string`);
    assert.ok(val.trim().length > 0, `Key "${key}" in locale "${lang.code}" must not be empty`);
  }

  // Verify non-French locales do not accidentally inherit French extraTranslations
  if (lang.code !== 'fr') {
    assert.notEqual(
      dict.softwareUpdateTitle,
      translations.fr.softwareUpdateTitle,
      `Locale "${lang.code}" should have a localized softwareUpdateTitle instead of French fallback`
    );
    assert.notEqual(
      dict.checkUpdateBtn,
      translations.fr.checkUpdateBtn,
      `Locale "${lang.code}" should have a localized checkUpdateBtn instead of French fallback`
    );
    assert.notEqual(
      dict.openFileBtn,
      translations.fr.openFileBtn,
      `Locale "${lang.code}" should have a localized openFileBtn`
    );
    assert.notEqual(
      dict.addToQueueMenu,
      translations.fr.addToQueueMenu,
      `Locale "${lang.code}" should have a localized addToQueueMenu`
    );
  }

  // Verify getT(lang.code) returns the exact locale dictionary
  assert.equal(getT(lang.code).settingsTabAppearance, dict.settingsTabAppearance);
}

console.log(`✅ i18n Menu & Dictionary Audit passed across all ${SUPPORTED_LANGUAGES.length} locales (${referenceKeys.length} keys per locale).`);
