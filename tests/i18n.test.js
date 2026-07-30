import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createTranslator, languageMessageKey } from "../src/lib/i18n.js";

test("translator uses Chrome locale messages and falls back to Simplified Chinese", () => {
  const english = createTranslator(
    (key) => ({ moreButton: "More" })[key] ?? "",
    { moreButton: "更多", unknownError: "未知错误" }
  );
  assert.equal(english("moreButton"), "More");
  assert.equal(english("unknownError"), "未知错误");
});

test("stored language values map to localized display labels without migration", () => {
  assert.equal(languageMessageKey("英语"), "languageEnglish");
  assert.equal(languageMessageKey("简体中文"), "languageSimplifiedChinese");
  assert.equal(languageMessageKey("not-a-language"), undefined);
});

test("every localized string referenced by the UI exists in both locale catalogs", async () => {
  const sourceUrls = [
    "../src/background.js",
    "../src/content.js",
    "../src/options/options.html",
    "../src/options/options.js",
    "../src/lib/activation.js",
    "../src/lib/coordinator.js",
    "../src/lib/deepseek.js",
    "../src/lib/settings.js",
    "../src/lib/prompts.js"
  ];
  const [sources, chinese, english] = await Promise.all([
    Promise.all(sourceUrls.map((url) => readFile(new URL(url, import.meta.url), "utf8"))),
    readFile(new URL("../_locales/zh_CN/messages.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../_locales/en/messages.json", import.meta.url), "utf8").then(JSON.parse)
  ]);
  const referenced = new Set();
  for (const source of sources) {
    for (const match of source.matchAll(/\bt\("([A-Za-z0-9_]+)"/g)) referenced.add(match[1]);
    for (const match of source.matchAll(/data-i18n(?:-aria-label)?="([A-Za-z0-9_]+)"/g)) {
      referenced.add(match[1]);
    }
  }

  for (const key of referenced) {
    assert.ok(chinese[key]?.message, `missing zh_CN message: ${key}`);
    assert.ok(english[key]?.message, `missing en message: ${key}`);
  }
});
