import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(resolve(projectRoot, "manifest.json"), "utf8"));

async function readMessages(locale) {
  return JSON.parse(await readFile(
    resolve(projectRoot, "_locales", locale, "messages.json"),
    "utf8"
  ));
}

test("manifest uses MV3 and privacy-minimal page permissions", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions.sort(), ["activeTab", "contextMenus", "scripting", "storage"]);
  assert.deepEqual(manifest.host_permissions, ["https://api.deepseek.com/*"]);
  assert.deepEqual(manifest.optional_host_permissions.sort(), ["http://*/*", "https://*/*"]);
  assert.equal(manifest.action.default_popup, undefined);
});

test("all manifest file references exist", async () => {
  const paths = [
    manifest.background.service_worker,
    manifest.options_page,
    ...Object.values(manifest.action.default_icon),
    ...Object.values(manifest.icons)
  ];
  await Promise.all(paths.map((path) => access(resolve(projectRoot, path))));
});

test("manifest localizes EasyTranslate with Simplified Chinese as the default", async () => {
  assert.equal(manifest.name, "__MSG_extensionName__");
  assert.equal(manifest.description, "__MSG_extensionDescription__");
  assert.equal(manifest.action.default_title, "__MSG_actionEnable__");
  assert.equal(manifest.default_locale, "zh_CN");

  const [chinese, english] = await Promise.all([
    readMessages("zh_CN"),
    readMessages("en")
  ]);
  assert.equal(chinese.extensionName.message, "EasyTranslate");
  assert.equal(english.extensionName.message, "EasyTranslate");
  assert.equal(chinese.optionsTitle.message, "EasyTranslate 设置");
  assert.equal(english.optionsTitle.message, "EasyTranslate Settings");
  assert.deepEqual(Object.keys(english).sort(), Object.keys(chinese).sort());
});
