export const DEFAULT_SETTINGS = Object.freeze({
  model: "deepseek-v4-flash",
  sourceLanguage: "英语",
  targetLanguage: "简体中文"
});

export const MODELS = Object.freeze([
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash（推荐）", labelKey: "modelDeepSeekFlash" },
  { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", labelKey: "modelDeepSeekPro" }
]);

export const LANGUAGES = Object.freeze([
  "自动识别",
  "英语",
  "简体中文",
  "繁体中文",
  "日语",
  "韩语",
  "法语",
  "德语",
  "西班牙语",
  "葡萄牙语",
  "俄语"
]);

export const CACHE_TTL_MS = 2 * 24 * 60 * 60 * 1000;
export const CACHE_STORAGE_KEY = "translationCacheV1";
export const SETTINGS_STORAGE_KEY = "translatorSettingsV1";
export const API_KEY_STORAGE_KEY = "deepseekApiKeyV1";
export const PROMPT_VERSION = 2;
export const MAX_CACHE_ENTRIES_PER_PAGE = 300;
export const MAX_CACHE_ENTRIES_TOTAL = 3000;

export const MESSAGE = Object.freeze({
  SET_ENABLED: "translator:set-enabled",
  SHOW_ERROR: "translator:show-error",
  TRANSLATE: "translator:translate",
  EXPAND: "translator:expand",
  TEST_API: "translator:test-api",
  GET_GLOBAL_MODE: "translator:get-global-mode",
  SET_GLOBAL_MODE: "translator:set-global-mode"
});
