import {
  API_KEY_STORAGE_KEY,
  DEFAULT_SETTINGS,
  MODELS,
  SETTINGS_STORAGE_KEY
} from "./constants.js";
import { t } from "./i18n.js";

export async function getSettings() {
  const [localData, syncData] = await Promise.all([
    chrome.storage.local.get(API_KEY_STORAGE_KEY),
    chrome.storage.sync.get(SETTINGS_STORAGE_KEY)
  ]);

  return {
    ...DEFAULT_SETTINGS,
    ...(syncData[SETTINGS_STORAGE_KEY] ?? {}),
    apiKey: localData[API_KEY_STORAGE_KEY] ?? ""
  };
}

export async function saveSettings(settings) {
  const modelIds = new Set(MODELS.map((model) => model.id));
  if (!modelIds.has(settings.model)) {
    throw new Error(t("selectValidModel", null, "请选择有效的 DeepSeek 模型"));
  }

  const apiKey = String(settings.apiKey ?? "").trim();
  if (!apiKey) {
    throw new Error(t("apiKeyRequired", null, "请填写 DeepSeek API Key"));
  }

  await Promise.all([
    chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: apiKey }),
    chrome.storage.sync.set({
      [SETTINGS_STORAGE_KEY]: {
        model: settings.model,
        sourceLanguage: settings.sourceLanguage,
        targetLanguage: settings.targetLanguage
      }
    })
  ]);
}

export function hasApiKey(settings) {
  return Boolean(settings.apiKey?.trim());
}
