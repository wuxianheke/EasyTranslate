(() => {
  const MESSAGE = {
    SET_ENABLED: "translator:set-enabled",
    SHOW_ERROR: "translator:show-error",
    TRANSLATE: "translator:translate",
    EXPAND: "translator:expand"
  };

  if (globalThis.__selectionTranslatorExtension) return;

  const core = globalThis.SelectionTranslatorCore;
  const cardLifecycle = globalThis.SelectionTranslatorCardLifecycle;
  const runtimeCore = globalThis.SelectionTranslatorRuntimeCore;
  const extensionRuntime = globalThis.chrome?.runtime;
  const extensionI18n = globalThis.chrome?.i18n;
  if (
    !core
    || !cardLifecycle
    || !runtimeCore
    || runtimeCore.isUnavailableExtensionRuntime(extensionRuntime)
    || typeof extensionRuntime?.onMessage?.addListener !== "function"
  ) return;

  const t = (key, fallback) => {
    try {
      return extensionI18n?.getMessage?.(key) || fallback;
    } catch {
      return fallback;
    }
  };

  const state = {
    enabled: false,
    timer: null,
    requestId: 0,
    current: null,
    dismissedSignature: "",
    host: null,
    shadow: null,
    toastTimer: null
  };

  const cardAutoCloser = cardLifecycle.createCardAutoCloser({
    onExpire: () => closeCard(false)
  });

  globalThis.__selectionTranslatorExtension = { setEnabled };
  extensionRuntime.onMessage.addListener((message) => {
    if (message?.type === MESSAGE.SET_ENABLED) setEnabled(Boolean(message.enabled));
    if (message?.type === MESSAGE.SHOW_ERROR) showErrorToast(message.message);
  });

  function setEnabled(enabled) {
    if (state.enabled === enabled) return;
    state.enabled = enabled;
    if (enabled) {
      document.addEventListener("mouseup", scheduleSelection, true);
      document.addEventListener("keyup", scheduleSelection, true);
      document.addEventListener("keydown", handleEscape, true);
    } else {
      document.removeEventListener("mouseup", scheduleSelection, true);
      document.removeEventListener("keyup", scheduleSelection, true);
      document.removeEventListener("keydown", handleEscape, true);
      clearTimeout(state.timer);
      removeAllUi();
    }
  }

  function scheduleSelection(event) {
    if (!state.enabled || isInsideCard(event)) return;
    clearTimeout(state.timer);
    state.timer = setTimeout(handleSelection, 250);
  }

  async function handleSelection() {
    if (!state.enabled) return;
    const selection = window.getSelection();
    const extracted = core.extractContext(selection);
    const rect = core.selectionRect(selection);
    if (!extracted || !rect) {
      state.dismissedSignature = "";
      return;
    }

    const selectedText = extracted.selectedText.slice(0, 4_000);
    const contextText = extracted.contextText.slice(0, 8_000);
    const signature = `${selectedText}\n${contextText}`;
    if (signature === state.dismissedSignature || signature === state.current?.signature) return;
    state.dismissedSignature = "";

    const id = ++state.requestId;
    const payload = {
      pageUrl: location.href,
      selectedText,
      contextText
    };
    state.current = { id, payload, rect, signature, translation: "" };
    renderLoading(rect);

    const response = await sendMessage({ type: MESSAGE.TRANSLATE, payload });
    if (!state.enabled || state.current?.id !== id) return;
    if (!response.ok) {
      renderError(response.error, rect);
      return;
    }

    state.current.translation = response.data.translation;
    renderTranslation(response.data.translation, rect);
  }

  function renderLoading(rect) {
    const root = createCard(rect);
    const line = document.createElement("div");
    line.className = "loading";
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    const text = document.createElement("span");
    text.textContent = t("translationLoading", "翻译中…");
    line.append(spinner, text);
    root.append(line);
  }

  function renderTranslation(translation, rect) {
    const root = createCard(rect);
    const value = document.createElement("div");
    value.className = "translation";
    value.textContent = translation;

    const actions = document.createElement("div");
    actions.className = "actions";
    const more = document.createElement("button");
    more.type = "button";
    more.className = "more";
    more.textContent = t("moreButton", "更多");
    more.addEventListener("click", () => requestExpansion(more, rect));
    actions.append(more);
    root.append(value, actions);
  }

  async function requestExpansion(button, rect) {
    const current = state.current;
    if (!current?.translation || button.disabled) return;
    cardAutoCloser.arm();
    button.disabled = true;
    button.textContent = t("loadingMore", "加载中…");

    const response = await sendMessage({
      type: MESSAGE.EXPAND,
      payload: { ...current.payload, translation: current.translation }
    });
    if (!state.enabled || state.current?.id !== current.id) return;

    if (!response.ok) {
      button.disabled = false;
      button.textContent = t("retryMore", "重试更多");
      showInlineError(response.error);
      return;
    }

    renderExpansion(response.data, rect);
  }

  function renderExpansion(details, rect) {
    const root = createCard(rect);
    const value = document.createElement("div");
    value.className = "translation";
    value.textContent = state.current.translation;
    root.append(value);

    if (details.meanings?.length) {
      const section = document.createElement("div");
      section.className = "details";
      const label = document.createElement("div");
      label.className = "label";
      label.textContent = t("otherMeanings", "其他意思");
      const list = document.createElement("ul");
      for (const meaning of details.meanings) {
        const item = document.createElement("li");
        item.textContent = meaning;
        list.append(item);
      }
      section.append(label, list);
      root.append(section);
    }

    if (details.example) {
      const section = document.createElement("div");
      section.className = "details example";
      const label = document.createElement("div");
      label.className = "label";
      label.textContent = t("exampleLabel", "例句");
      const source = document.createElement("div");
      source.textContent = details.example.source;
      const target = document.createElement("div");
      target.className = "example-target";
      target.textContent = details.example.target;
      section.append(label, source, target);
      root.append(section);
    }
  }

  function renderError(message) {
    closeCard(false);
    showErrorToast(message || t("translationFailed", "翻译失败，请稍后重试"));
  }

  function showInlineError(message) {
    const old = state.shadow?.querySelector(".inline-error");
    old?.remove();
    const error = document.createElement("div");
    error.className = "inline-error";
    error.textContent = message || t("loadFailed", "加载失败");
    state.shadow?.querySelector(".card")?.append(error);
    positionCard(state.current.rect);
    showErrorToast(message || t("loadFailed", "加载失败"));
  }

  function showErrorToast(message) {
    ensureHost();
    clearTimeout(state.toastTimer);
    state.shadow.querySelector(".toast")?.remove();

    const toast = document.createElement("aside");
    toast.className = "toast";
    toast.setAttribute("role", "alert");

    const marker = document.createElement("span");
    marker.className = "toast-marker";
    marker.textContent = "!";

    const body = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = t("errorTitle", "EasyTranslate 出现错误");
    const detail = document.createElement("div");
    detail.className = "toast-detail";
    detail.textContent = String(message || t("unknownError", "未知错误"));
    body.append(title, detail);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "toast-close";
    close.setAttribute("aria-label", t("closeError", "关闭错误提示"));
    close.textContent = "×";
    close.addEventListener("click", removeToast);

    toast.append(marker, body, close);
    state.shadow.append(toast);
    state.toastTimer = setTimeout(removeToast, 7_000);
  }

  function removeToast() {
    clearTimeout(state.toastTimer);
    state.toastTimer = null;
    state.shadow?.querySelector(".toast")?.remove();
    removeHostIfEmpty();
  }

  function createCard(rect) {
    ensureHost();
    const oldCard = state.shadow.querySelector(".card");
    oldCard?.remove();

    const card = document.createElement("section");
    card.className = "card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", t("translationResult", "划词翻译结果"));
    card.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    card.addEventListener("click", (event) => {
      if (cardLifecycle.shouldDismissCardClick(event.target)) closeCard(true);
    });

    const close = document.createElement("button");
    close.type = "button";
    close.className = "close";
    close.setAttribute("aria-label", t("closeTranslation", "关闭翻译"));
    close.textContent = "×";
    close.addEventListener("click", () => closeCard(true));
    card.append(close);
    state.shadow.append(card);
    cardAutoCloser.arm();
    requestAnimationFrame(() => positionCard(rect));
    return card;
  }

  function ensureHost() {
    if (state.host?.isConnected) return;
    const host = document.createElement("div");
    host.id = "selection-translator-extension-root";
    host.style.all = "initial";
    host.style.position = "fixed";
    host.style.zIndex = "2147483647";
    host.style.left = "0";
    host.style.top = "0";
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; color-scheme: light; }
      .card {
        position: fixed; box-sizing: border-box; width: min(340px, calc(100vw - 24px));
        max-height: min(420px, calc(100vh - 24px)); overflow: auto;
        padding: 17px 18px 14px; border: 1px solid rgba(20, 30, 55, .12);
        border-radius: 12px; background: #fff; color: #172033;
        box-shadow: 0 12px 36px rgba(22, 34, 61, .20), 0 2px 8px rgba(22, 34, 61, .10);
        font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: normal; text-align: left;
      }
      .toast {
        position: fixed; top: 16px; right: 16px; box-sizing: border-box;
        display: grid; grid-template-columns: 24px minmax(0, 1fr) 24px; gap: 10px;
        width: min(390px, calc(100vw - 32px)); padding: 14px 12px;
        border: 1px solid #f0c6c6; border-left: 4px solid #d64545; border-radius: 11px;
        background: #fffafa; color: #712b2b;
        box-shadow: 0 12px 34px rgba(65, 19, 19, .18);
        font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        animation: toast-in .16s ease-out;
      }
      .toast-marker { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: #d64545; color: white; font-weight: 800; }
      .toast strong { display: block; margin-bottom: 2px; color: #8e2f2f; font-size: 13px; }
      .toast-detail { color: #713b3b; overflow-wrap: anywhere; }
      .toast-close { width: 24px; height: 24px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: #9a6565; font: 20px/22px Arial, sans-serif; cursor: pointer; }
      .toast-close:hover { background: #f6e5e5; color: #712b2b; }
      @keyframes toast-in { from { opacity: 0; transform: translateY(-8px); } }
      .close {
        position: absolute; top: 6px; right: 8px; width: 26px; height: 26px;
        padding: 0; border: 0; border-radius: 7px; background: transparent;
        color: #7a8290; font: 22px/24px Arial, sans-serif; cursor: pointer;
      }
      .close:hover { background: #f0f2f6; color: #172033; }
      .translation { padding-right: 22px; font-size: 16px; font-weight: 600; word-break: break-word; }
      .loading { display: flex; align-items: center; gap: 9px; color: #687187; }
      .spinner { width: 14px; height: 14px; border: 2px solid #d8dcef; border-top-color: #5d57e8; border-radius: 50%; animation: spin .75s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .actions { display: flex; justify-content: flex-end; margin-top: 10px; }
      .more { padding: 5px 10px; border: 0; border-radius: 7px; background: #eeedff; color: #5149d8; font: 600 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; cursor: pointer; }
      .more:hover { background: #e2e0ff; }
      .more:disabled { cursor: default; opacity: .7; }
      .details { margin-top: 13px; padding-top: 11px; border-top: 1px solid #eceef3; color: #30394c; }
      .label { margin-bottom: 5px; color: #7a8290; font-size: 12px; font-weight: 600; }
      ul { margin: 0; padding-left: 20px; }
      li + li { margin-top: 3px; }
      .example-target { margin-top: 4px; color: #667085; }
      .error, .inline-error { padding-right: 20px; color: #bd3636; }
      .inline-error { margin-top: 9px; padding-top: 8px; border-top: 1px solid #f2dddd; font-size: 12px; }
    `;
    shadow.append(style);
    document.documentElement.append(host);
    state.host = host;
    state.shadow = shadow;
  }

  function positionCard(rect) {
    const card = state.shadow?.querySelector(".card");
    if (!card || !rect) return;
    const margin = 12;
    const gap = 8;
    const size = card.getBoundingClientRect();
    const desiredLeft = rect.left + Math.min(rect.width, 28);
    const left = Math.max(margin, Math.min(desiredLeft, window.innerWidth - size.width - margin));
    let top = rect.bottom + gap;
    if (top + size.height > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - size.height - gap);
    }
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
  }

  function closeCard(markDismissed) {
    cardAutoCloser.clear();
    if (markDismissed && state.current?.signature) state.dismissedSignature = state.current.signature;
    state.requestId += 1;
    state.current = null;
    state.shadow?.querySelector(".card")?.remove();
    removeHostIfEmpty();
  }

  function removeAllUi() {
    cardAutoCloser.clear();
    clearTimeout(state.toastTimer);
    state.toastTimer = null;
    state.requestId += 1;
    state.current = null;
    state.host?.remove();
    state.host = null;
    state.shadow = null;
  }

  function removeHostIfEmpty() {
    if (state.shadow?.querySelector(".card, .toast")) return;
    state.host?.remove();
    state.host = null;
    state.shadow = null;
  }

  function handleEscape(event) {
    if (event.key === "Escape" && state.host) closeCard(true);
  }

  function isInsideCard(event) {
    return event.composedPath?.().includes(state.host);
  }

  async function sendMessage(message) {
    if (runtimeCore.isUnavailableExtensionRuntime(extensionRuntime)) {
      setEnabled(false);
      return { ok: false, ignored: true };
    }
    try {
      const response = await extensionRuntime.sendMessage(message);
      return response ?? {
        ok: false,
        error: t("backgroundNoResponse", "扩展后台没有响应")
      };
    } catch (error) {
      if (runtimeCore.isInvalidatedExtensionContext(error)) {
        setEnabled(false);
        return { ok: false, ignored: true };
      }
      return {
        ok: false,
        error: error?.message || t("communicationFailed", "扩展通信失败")
      };
    }
  }
})();
