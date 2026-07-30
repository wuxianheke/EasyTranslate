import test from "node:test";
import assert from "node:assert/strict";
import { createCacheKey, normalizePageUrl } from "../src/lib/cache.js";

const request = {
  pageKey: "https://example.com/article?q=1",
  selectedText: "bank",
  contextText: "river bank",
  sourceLanguage: "英语",
  targetLanguage: "简体中文",
  model: "deepseek-v4-flash"
};

test("page cache ignores URL fragments but keeps query strings", () => {
  assert.equal(
    normalizePageUrl("https://example.com/article?q=1#chapter"),
    "https://example.com/article?q=1"
  );
});

test("cache key is deterministic and changes with context", async () => {
  const first = await createCacheKey(request);
  const second = await createCacheKey({ ...request });
  const otherContext = await createCacheKey({ ...request, contextText: "money bank" });
  assert.equal(first, second);
  assert.notEqual(first, otherContext);
});

test("cache key trims selected text and still matches the complete selection exactly", async () => {
  const supported = await createCacheKey({ ...request, selectedText: "supported" });
  const paddedSupported = await createCacheKey({ ...request, selectedText: "  supported\n" });
  const supportedLanguages = await createCacheKey({
    ...request,
    selectedText: "supported languages"
  });

  assert.equal(paddedSupported, supported);
  assert.notEqual(supported, supportedLanguages);
});
