import test from "node:test";
import assert from "node:assert/strict";
import { createGlobalModeController } from "../src/lib/global-mode.js";

function createHarness({ permissionGranted = true } = {}) {
  const events = [];
  let stored = false;
  const controller = createGlobalModeController({
    requestHostAccess: async () => {
      events.push("request-access");
      return permissionGranted;
    },
    hasHostAccess: async () => permissionGranted,
    removeHostAccess: async () => events.push("remove-access"),
    loadEnabled: async () => stored,
    saveEnabled: async (enabled) => {
      stored = enabled;
      events.push(`save:${enabled}`);
    },
    updateMenu: async (enabled) => events.push(`menu:${enabled}`),
    enableAllTabs: async () => events.push("enable-tabs"),
    disableAllTabs: async () => events.push("disable-tabs")
  });
  return { controller, events, getStored: () => stored };
}

test("global mode stays off when optional website access is denied", async () => {
  const harness = createHarness({ permissionGranted: false });

  const result = await harness.controller.enableFromUserGesture();

  assert.deepEqual(result, { enabled: false, permissionDenied: true });
  assert.equal(harness.getStored(), false);
  assert.deepEqual(harness.events, ["request-access", "save:false", "menu:false"]);
});

test("global mode enables all pages and disabling it revokes website access", async () => {
  const harness = createHarness();

  assert.deepEqual(await harness.controller.enableFromUserGesture(), {
    enabled: true,
    permissionDenied: false
  });
  assert.equal(harness.getStored(), true);
  assert.deepEqual(harness.events, [
    "request-access",
    "save:true",
    "menu:true",
    "enable-tabs"
  ]);

  harness.events.length = 0;
  assert.deepEqual(await harness.controller.disable(), { enabled: false });
  assert.equal(harness.getStored(), false);
  assert.deepEqual(harness.events, [
    "save:false",
    "menu:false",
    "disable-tabs",
    "remove-access"
  ]);
});

test("settings switch enables global mode with access it already requested", async () => {
  const harness = createHarness();

  assert.deepEqual(await harness.controller.enableWithExistingAccess(), {
    enabled: true,
    permissionDenied: false
  });
  assert.deepEqual(harness.events, ["save:true", "menu:true", "enable-tabs"]);
});
