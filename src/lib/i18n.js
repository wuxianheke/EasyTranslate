const LANGUAGE_MESSAGE_KEYS = Object.freeze({
  "自动识别": "languageAutoDetect",
  "英语": "languageEnglish",
  "简体中文": "languageSimplifiedChinese",
  "繁体中文": "languageTraditionalChinese",
  "日语": "languageJapanese",
  "韩语": "languageKorean",
  "法语": "languageFrench",
  "德语": "languageGerman",
  "西班牙语": "languageSpanish",
  "葡萄牙语": "languagePortuguese",
  "俄语": "languageRussian"
});

export function createTranslator(getMessage, fallbackMessages = {}) {
  return (key, substitutions) => {
    try {
      const localized = getMessage?.(key, substitutions);
      if (localized) return localized;
    } catch {
      // Chrome i18n can be unavailable in tests or an invalidated extension context.
    }
    return fallbackMessages[key] ?? key;
  };
}

const chromeTranslator = createTranslator(
  (key, substitutions) => globalThis.chrome?.i18n?.getMessage?.(key, substitutions)
);

export function t(key, substitutions, fallback = key) {
  const translated = chromeTranslator(key, substitutions);
  return translated === key ? fallback : translated;
}

export function languageMessageKey(storedValue) {
  return LANGUAGE_MESSAGE_KEYS[storedValue];
}

export function localizeDocument(root = document) {
  for (const element of root.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n) || element.textContent;
  }
  for (const element of root.querySelectorAll("[data-i18n-aria-label]")) {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  }
  const locale = globalThis.chrome?.i18n?.getUILanguage?.();
  if (locale && root.documentElement) root.documentElement.lang = locale.replace("_", "-");
}
