import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../src/options/options.html", import.meta.url), "utf8");

test("settings exposes global mode as an accessible switch", () => {
  assert.match(html, /id="global-mode"/);
  assert.match(html, /role="switch"/);
  assert.match(html, /data-i18n="globalModeLabel"/);
});

test("settings page marks all visible copy for localization", () => {
  assert.match(html, /data-i18n="optionsHeading">EasyTranslate</);
  assert.match(html, /data-i18n="modelLabel"/);
  assert.match(html, /data-i18n="sourceLanguageLabel"/);
  assert.match(html, /data-i18n="targetLanguageLabel"/);
  assert.match(html, /data-i18n="testConnectionButton"/);
  assert.match(html, /data-i18n="saveSettingsButton"/);
});
