import test from "node:test";
import assert from "node:assert/strict";
import { isSupportedPageUrl } from "../src/lib/page-access.js";

test("only ordinary http and https pages can enable selection translation", () => {
  assert.equal(isSupportedPageUrl("https://github.com/openai/codex"), true);
  assert.equal(isSupportedPageUrl("http://localhost:3000/docs"), true);

  assert.equal(
    isSupportedPageUrl("chrome-extension://abcdefghijklmnop/src/options/options.html"),
    false
  );
  assert.equal(isSupportedPageUrl("chrome://extensions/"), false);
  assert.equal(isSupportedPageUrl("https://chromewebstore.google.com/detail/example"), false);
  assert.equal(isSupportedPageUrl("https://chrome.google.com/webstore/detail/example"), false);
});
