(() => {
  if (globalThis.SelectionTranslatorRuntimeCore) return;

  function isInvalidatedExtensionContext(error) {
    const message = String(error?.message ?? error ?? "");
    return /extension context invalidated/i.test(message)
      || /cannot read properties of undefined \(reading ['"]sendMessage['"]\)/i.test(message);
  }

  function isUnavailableExtensionRuntime(runtime) {
    return typeof runtime?.sendMessage !== "function";
  }

  globalThis.SelectionTranslatorRuntimeCore = {
    isInvalidatedExtensionContext,
    isUnavailableExtensionRuntime
  };
})();
