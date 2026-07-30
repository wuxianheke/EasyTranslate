import test from "node:test";
import assert from "node:assert/strict";
import { setToolbarIcon } from "../src/lib/action-icon.js";

test("toolbar icon update sends pixel data instead of fetchable asset paths", async () => {
  const calls = [];
  const imageData = {
    16: { width: 16, height: 16, data: "pixels-16" },
    32: { width: 32, height: 32, data: "pixels-32" }
  };

  await setToolbarIcon({
    action: {
      async setIcon(details) {
        if (details.path) {
          throw new Error("Failed to set icon 'assets/icon-on-48.png': Failed to fetch");
        }
        calls.push(details);
      }
    },
    tabId: 42,
    enabled: true,
    createImageData: () => imageData
  });

  assert.deepEqual(calls, [{ tabId: 42, imageData }]);
});
