import { DEFAULT_SETTINGS, LANGUAGES, MESSAGE, MODELS } from "../lib/constants.js";
import { GLOBAL_HOST_ORIGINS, GLOBAL_MODE_STORAGE_KEY } from "../lib/global-mode.js";
import { languageMessageKey, localizeDocument, t } from "../lib/i18n.js";
import { getSettings, saveSettings } from "../lib/settings.js";

const form = document.querySelector("#settings-form");
const modelSelect = document.querySelector("#model");
const apiKeyInput = document.querySelector("#api-key");
const sourceSelect = document.querySelector("#source-language");
const targetSelect = document.querySelector("#target-language");
const testButton = document.querySelector("#test-api");
const globalModeInput = document.querySelector("#global-mode");
const status = document.querySelector("#status");

localizeDocument();
fillSelect(modelSelect, MODELS.map(({ id, label, labelKey }) => [id, t(labelKey, null, label)]));
fillSelect(sourceSelect, LANGUAGES.map((language) => [
  language,
  t(languageMessageKey(language), null, language)
]));
fillSelect(targetSelect, LANGUAGES.filter((language) => language !== "自动识别")
  .map((language) => [language, t(languageMessageKey(language), null, language)]));

load().catch((error) => showStatus(error.message, false));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(true);
  try {
    await saveSettings(readForm());
    showStatus(t("settingsSaved"), true);
  } catch (error) {
    showStatus(error.message, false);
  } finally {
    setBusy(false);
  }
});

testButton.addEventListener("click", async () => {
  const apiKey = apiKeyInput.value.trim();
  setBusy(true);
  showStatus(t("connectingDeepSeek"), true);
  try {
    const response = await chrome.runtime.sendMessage({ type: MESSAGE.TEST_API, apiKey });
    if (!response?.ok) throw new Error(response?.error || t("connectionTestFailed"));
    const count = response.data.models.length;
    showStatus(count ? t("connectionSuccessWithCount", String(count)) : t("connectionSuccess"), true);
  } catch (error) {
    showStatus(error.message, false);
  } finally {
    setBusy(false);
  }
});

globalModeInput.addEventListener("change", async () => {
  const requested = globalModeInput.checked;
  globalModeInput.disabled = true;
  try {
    if (requested) {
      const granted = await chrome.permissions.request({ origins: GLOBAL_HOST_ORIGINS });
      if (!granted) throw new Error(t("globalPermissionRequired"));
    }

    const response = await chrome.runtime.sendMessage({
      type: MESSAGE.SET_GLOBAL_MODE,
      enabled: requested
    });
    if (!response?.ok) throw new Error(response?.error || t("globalModeUpdateFailed"));
    globalModeInput.checked = Boolean(response.data.enabled);
    showStatus(globalModeInput.checked ? t("globalModeEnabled") : t("globalModeDisabled"), true);
  } catch (error) {
    globalModeInput.checked = !requested;
    showStatus(error.message, false);
  } finally {
    globalModeInput.disabled = false;
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[GLOBAL_MODE_STORAGE_KEY]) return;
  globalModeInput.checked = Boolean(changes[GLOBAL_MODE_STORAGE_KEY].newValue);
});

async function load() {
  const [settings, globalModeResponse] = await Promise.all([
    getSettings(),
    chrome.runtime.sendMessage({ type: MESSAGE.GET_GLOBAL_MODE })
  ]);
  modelSelect.value = settings.model || DEFAULT_SETTINGS.model;
  apiKeyInput.value = settings.apiKey;
  sourceSelect.value = settings.sourceLanguage || DEFAULT_SETTINGS.sourceLanguage;
  targetSelect.value = settings.targetLanguage || DEFAULT_SETTINGS.targetLanguage;
  globalModeInput.checked = Boolean(globalModeResponse?.ok && globalModeResponse.data.enabled);
}

function readForm() {
  return {
    model: modelSelect.value,
    apiKey: apiKeyInput.value,
    sourceLanguage: sourceSelect.value,
    targetLanguage: targetSelect.value
  };
}

function fillSelect(select, options) {
  for (const [value, label] of options) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
}

function setBusy(busy) {
  for (const button of form.querySelectorAll("button")) button.disabled = busy;
}

function showStatus(message, success) {
  status.textContent = message;
  status.className = success ? "success" : "error";
}
