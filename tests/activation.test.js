import test from "node:test";
import assert from "node:assert/strict";
import { activatePage } from "../src/lib/activation.js";

test("page stays enabled and receives an error notice when only the toolbar icon update fails", async () => {
  const calls = [];
  const result = await activatePage({
    inject: async () => calls.push("inject"),
    enablePage: async () => calls.push("enable-page"),
    persistEnabled: async () => calls.push("persist"),
    updateAction: async () => {
      calls.push("update-action");
      throw new Error("icon decode failed");
    },
    notifyPageError: async (message) => calls.push(`notify:${message}`)
  });

  assert.equal(result.enabled, true);
  assert.deepEqual(calls, [
    "inject",
    "enable-page",
    "persist",
    "update-action",
    "notify:扩展已开启，但工具栏状态更新失败：icon decode failed"
  ]);
});

test("script injection failure is reported as the real activation error", async () => {
  await assert.rejects(
    activatePage({
      inject: async () => {
        throw new Error("Cannot access contents of url https://example.com");
      },
      enablePage: async () => {},
      persistEnabled: async () => {},
      updateAction: async () => {},
      notifyPageError: async () => {}
    }),
    (error) => {
      assert.equal(error.name, "PageActivationError");
      assert.equal(error.stage, "inject");
      assert.equal(
        error.message,
        "页面脚本注入失败：Cannot access contents of url https://example.com"
      );
      return true;
    }
  );
});
