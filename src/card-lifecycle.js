(() => {
  if (globalThis.SelectionTranslatorCardLifecycle) return;

  const AUTO_CLOSE_MS = 10_000;

  function createCardAutoCloser({
    setTimer = globalThis.setTimeout,
    clearTimer = globalThis.clearTimeout,
    onExpire
  }) {
    let timerId = null;

    function clear() {
      if (timerId === null) return;
      clearTimer(timerId);
      timerId = null;
    }

    function arm() {
      clear();
      timerId = setTimer(() => {
        timerId = null;
        onExpire();
      }, AUTO_CLOSE_MS);
    }

    return { arm, clear };
  }

  function shouldDismissCardClick(target) {
    return !target?.closest?.("button");
  }

  globalThis.SelectionTranslatorCardLifecycle = {
    AUTO_CLOSE_MS,
    createCardAutoCloser,
    shouldDismissCardClick
  };
})();
