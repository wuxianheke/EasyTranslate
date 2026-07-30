import { TranslationCache, normalizePageUrl } from "./cache.js";
import { DeepSeekAdapter } from "./deepseek.js";
import { t } from "./i18n.js";
import {
  buildExpansionMessages,
  buildTranslationMessages,
  parseExpansionResponse,
  parseTranslationResponse
} from "./prompts.js";

const provider = new DeepSeekAdapter();
const cache = new TranslationCache();
const inFlightTranslations = new Map();

export async function translateSelection(input, settings) {
  const request = normalizeRequest(input, settings);
  const cached = await cache.get(request);
  if (cached) return { translation: cached, cached: true };

  const requestKey = JSON.stringify(request);
  if (inFlightTranslations.has(requestKey)) return inFlightTranslations.get(requestKey);

  const pending = (async () => {
    const content = await provider.complete({
      apiKey: settings.apiKey,
      model: settings.model,
      messages: buildTranslationMessages(request),
      maxTokens: 180
    });
    const result = parseTranslationResponse(content);
    await cache.set(request, result.translation);
    return { ...result, cached: false };
  })();

  inFlightTranslations.set(requestKey, pending);
  try {
    return await pending;
  } finally {
    inFlightTranslations.delete(requestKey);
  }
}

export async function expandTranslation(input, settings) {
  const request = normalizeRequest(input, settings);
  const translation = cleanRequiredText(
    input.translation,
    t("missingBaseTranslation", null, "缺少基础译文"),
    4_000
  );
  const content = await provider.complete({
    apiKey: settings.apiKey,
    model: settings.model,
    messages: buildExpansionMessages({ ...request, translation }),
    maxTokens: 420
  });

  // “更多”按产品要求每次实时请求，绝不读取或写入 TranslationCache。
  return parseExpansionResponse(content);
}

export async function testDeepSeek(apiKey) {
  return provider.testConnection(apiKey);
}

function normalizeRequest(input, settings) {
  return {
    pageKey: normalizePageUrl(cleanRequiredText(
      input.pageUrl,
      t("missingPageUrl", null, "缺少页面地址"),
      8_000
    )),
    selectedText: cleanRequiredText(
      input.selectedText,
      t("missingSelectedText", null, "没有选中文字"),
      4_000
    ),
    contextText: cleanOptionalText(input.contextText, 8_000),
    sourceLanguage: settings.sourceLanguage,
    targetLanguage: settings.targetLanguage,
    model: settings.model
  };
}

function cleanRequiredText(value, message, maxLength) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(message);
  return text.slice(0, maxLength);
}

function cleanOptionalText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}
