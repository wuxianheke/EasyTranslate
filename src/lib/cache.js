import {
  CACHE_STORAGE_KEY,
  CACHE_TTL_MS,
  MAX_CACHE_ENTRIES_PER_PAGE,
  MAX_CACHE_ENTRIES_TOTAL,
  PROMPT_VERSION
} from "./constants.js";

let writeQueue = Promise.resolve();

export class TranslationCache {
  async get(request, now = Date.now()) {
    await writeQueue;
    const key = await createCacheKey(request);
    const entries = await readEntries();
    const entry = entries[key];
    if (!entry) return null;

    if (entry.expiresAt <= now) {
      delete entries[key];
      await chrome.storage.local.set({ [CACHE_STORAGE_KEY]: entries });
      return null;
    }

    return entry.translation;
  }

  async set(request, translation, now = Date.now()) {
    const operation = async () => {
      const key = await createCacheKey(request);
      const entries = await readEntries();
      prune(entries, request.pageKey, now);
      entries[key] = {
        pageKey: request.pageKey,
        translation,
        createdAt: now,
        expiresAt: now + CACHE_TTL_MS
      };
      prune(entries, request.pageKey, now);
      await chrome.storage.local.set({ [CACHE_STORAGE_KEY]: entries });
    };

    writeQueue = writeQueue.then(operation, operation);
    return writeQueue;
  }
}

export function normalizePageUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return String(url ?? "");
  }
}

export async function createCacheKey(request) {
  const input = JSON.stringify({
    pageKey: request.pageKey,
    selectedText: String(request.selectedText ?? "").trim(),
    contextText: request.contextText,
    sourceLanguage: request.sourceLanguage,
    targetLanguage: request.targetLanguage,
    model: request.model,
    promptVersion: PROMPT_VERSION
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readEntries() {
  const data = await chrome.storage.local.get(CACHE_STORAGE_KEY);
  return { ...(data[CACHE_STORAGE_KEY] ?? {}) };
}

function prune(entries, pageKey, now) {
  for (const [key, entry] of Object.entries(entries)) {
    if (!entry || entry.expiresAt <= now) delete entries[key];
  }

  removeOldest(entries, (entry) => entry.pageKey === pageKey, MAX_CACHE_ENTRIES_PER_PAGE);
  removeOldest(entries, () => true, MAX_CACHE_ENTRIES_TOTAL);
}

function removeOldest(entries, predicate, limit) {
  const matching = Object.entries(entries)
    .filter(([, entry]) => predicate(entry))
    .sort(([, left], [, right]) => right.createdAt - left.createdAt);
  for (const [key] of matching.slice(limit)) delete entries[key];
}
