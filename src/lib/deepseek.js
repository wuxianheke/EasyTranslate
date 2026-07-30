import { t } from "./i18n.js";

const API_BASE_URL = "https://api.deepseek.com";
const REQUEST_TIMEOUT_MS = 20_000;

export class DeepSeekAdapter {
  async complete({ apiKey, model, messages, maxTokens }) {
    const response = await fetchWithTimeout(`${API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        thinking: { type: "disabled" },
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: maxTokens
      })
    });

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(toUserMessage(response.status, payload));
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(t("deepSeekNoContent", null, "DeepSeek 没有返回内容"));
    }
    return content;
  }

  async testConnection(apiKey) {
    const response = await fetchWithTimeout(`${API_BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(toUserMessage(response.status, payload));
    }
    return Array.isArray(payload?.data) ? payload.data.map((item) => item.id).filter(Boolean) : [];
  }
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(t("deepSeekTimeout", null, "DeepSeek 请求超时，请稍后重试"));
    }
    throw new Error(t("deepSeekNetworkError", null, "无法连接 DeepSeek，请检查网络"));
  } finally {
    clearTimeout(timeout);
  }
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toUserMessage(status, payload) {
  const apiMessage = payload?.error?.message;
  if (status === 401 || status === 403) {
    return t("deepSeekInvalidApiKey", null, "DeepSeek API Key 无效，请检查设置");
  }
  if (status === 429) {
    return t("deepSeekRateLimited", null, "DeepSeek 请求过于频繁，请稍后重试");
  }
  if (status >= 500) {
    return t("deepSeekUnavailable", null, "DeepSeek 暂时不可用，请稍后重试");
  }
  return apiMessage
    ? t("deepSeekRequestFailedDetail", apiMessage, `DeepSeek 请求失败：${apiMessage}`)
    : t("deepSeekRequestFailedStatus", String(status), `DeepSeek 请求失败（${status}）`);
}
