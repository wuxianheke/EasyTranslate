import test from "node:test";
import assert from "node:assert/strict";

await import("../src/runtime-core.js");

const {
  isInvalidatedExtensionContext,
  isUnavailableExtensionRuntime
} = globalThis.SelectionTranslatorRuntimeCore;

test("stale content scripts recognize an invalidated extension context", () => {
  assert.equal(
    isInvalidatedExtensionContext(new Error("Extension context invalidated.")),
    true
  );
  assert.equal(isInvalidatedExtensionContext(new Error("Failed to fetch")), false);
});

test("stale content scripts retire when chrome.runtime or sendMessage is unavailable", () => {
  assert.equal(isUnavailableExtensionRuntime(undefined), true);
  assert.equal(isUnavailableExtensionRuntime({}), true);
  assert.equal(isUnavailableExtensionRuntime({ sendMessage() {} }), false);
  assert.equal(
    isInvalidatedExtensionContext(
      new TypeError("Cannot read properties of undefined (reading 'sendMessage')")
    ),
    true
  );
});
