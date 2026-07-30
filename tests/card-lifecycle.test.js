import test from "node:test";
import assert from "node:assert/strict";

await import("../src/card-lifecycle.js");

const {
  AUTO_CLOSE_MS,
  createCardAutoCloser,
  shouldDismissCardClick
} = globalThis.SelectionTranslatorCardLifecycle;

test("translation card auto-closes after 10 seconds and rearming resets the countdown", () => {
  const scheduled = new Map();
  const cleared = [];
  let nextId = 0;
  let closeCount = 0;
  const closer = createCardAutoCloser({
    setTimer(callback, delay) {
      const id = ++nextId;
      scheduled.set(id, { callback, delay });
      return id;
    },
    clearTimer(id) {
      cleared.push(id);
      scheduled.delete(id);
    },
    onExpire() {
      closeCount += 1;
    }
  });

  closer.arm();
  assert.equal(scheduled.get(1).delay, 10_000);
  assert.equal(AUTO_CLOSE_MS, 10_000);

  closer.arm();
  assert.deepEqual(cleared, [1]);
  assert.equal(scheduled.has(1), false);
  scheduled.get(2).callback();
  assert.equal(closeCount, 1);
});

test("clicking card content dismisses it while button interactions remain active", () => {
  const contentTarget = { closest: () => null };
  const buttonTarget = { closest: (selector) => selector === "button" ? {} : null };

  assert.equal(shouldDismissCardClick(contentTarget), true);
  assert.equal(shouldDismissCardClick(buttonTarget), false);
});
