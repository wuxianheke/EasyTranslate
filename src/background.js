import { MESSAGE } from "./lib/constants.js";
import { activatePage } from "./lib/activation.js";
import { setToolbarIcon } from "./lib/action-icon.js";
import { expandTranslation, testDeepSeek, translateSelection } from "./lib/coordinator.js";
import {
  createGlobalModeController,
  GLOBAL_HOST_ORIGINS,
  GLOBAL_MODE_MENU_ID,
  GLOBAL_MODE_STORAGE_KEY
} from "./lib/global-mode.js";
import { isSupportedPageUrl } from "./lib/page-access.js";
import { getSettings, hasApiKey } from "./lib/settings.js";
import { t } from "./lib/i18n.js";

const ENABLED_TABS_KEY = "enabledTranslatorTabsV1";
let tabStateQueue = Promise.resolve();

const globalMode = createGlobalModeController({
  requestHostAccess: () => chrome.permissions.request({ origins: GLOBAL_HOST_ORIGINS }),
  hasHostAccess: () => chrome.permissions.contains({ origins: GLOBAL_HOST_ORIGINS }),
  removeHostAccess: () => chrome.permissions.remove({ origins: GLOBAL_HOST_ORIGINS }),
  loadEnabled: getGlobalModeEnabled,
  saveEnabled: saveGlobalModeEnabled,
  updateMenu: updateGlobalMenu,
  enableAllTabs: enableAllSupportedTabs,
  disableAllTabs
});

configureStorageAccess().catch(() => {});

chrome.runtime.onInstalled.addListener(() => {
  initializeAfterInstall().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  configureStorageAccess().catch(() => {});
  globalMode.restore().catch(() => {});
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  if (!isSupportedPageUrl(tab.url)) {
    await removeTabState(tab.id).catch(() => {});
    await showUnsupportedPage(tab.id);
    return;
  }

  const settings = await getSettings();
  if (!hasApiKey(settings)) {
    await showNeedsSettings(tab.id);
    await chrome.runtime.openOptionsPage();
    return;
  }

  const shouldEnable = !(await getEnabledTabs())[tab.id];

  if (!shouldEnable) {
    await disableTab(tab.id);
    return;
  }

  await enableTab(tab, { reportErrors: true });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== GLOBAL_MODE_MENU_ID) return;

  if (info.checked) {
    globalMode.enableFromUserGesture()
      .then((result) => {
        if (result.permissionDenied && tab?.id) showGlobalPermissionDenied(tab.id).catch(() => {});
      })
      .catch(() => updateGlobalMenu(false).catch(() => {}));
    return;
  }

  globalMode.disable().catch(() => updateGlobalMenu(true).catch(() => {}));
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  handleTabUpdated(tabId, changeInfo, tab).catch(() => {});
});

chrome.tabs.onRemoved.addListener((tabId) => {
  removeTabState(tabId).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === MESSAGE.TRANSLATE) {
    respond(sendResponse, async () => {
      ensurePageSender(sender);
      const settings = await getSettings();
      if (!hasApiKey(settings)) {
        throw new Error(t("apiKeyRequiredSettings", null, "请先在扩展设置中填写 DeepSeek API Key"));
      }
      return translateSelection(message.payload, settings);
    });
    return true;
  }

  if (message?.type === MESSAGE.EXPAND) {
    respond(sendResponse, async () => {
      ensurePageSender(sender);
      const settings = await getSettings();
      if (!hasApiKey(settings)) {
        throw new Error(t("apiKeyRequiredSettings", null, "请先在扩展设置中填写 DeepSeek API Key"));
      }
      return expandTranslation(message.payload, settings);
    });
    return true;
  }

  if (message?.type === MESSAGE.TEST_API) {
    respond(sendResponse, async () => {
      const apiKey = String(message.apiKey ?? "").trim();
      if (!apiKey) throw new Error(t("apiKeyRequired", null, "请先填写 DeepSeek API Key"));
      const models = await testDeepSeek(apiKey);
      return { models };
    });
    return true;
  }

  if (message?.type === MESSAGE.GET_GLOBAL_MODE) {
    respond(sendResponse, async () => ({ enabled: await getGlobalModeEnabled() }));
    return true;
  }

  if (message?.type === MESSAGE.SET_GLOBAL_MODE) {
    respond(sendResponse, () => message.enabled
      ? globalMode.enableWithExistingAccess()
      : globalMode.disable());
    return true;
  }

  return false;
});

async function configureStorageAccess() {
  await Promise.all([
    chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }),
    chrome.storage.sync.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" })
  ]);
}

async function initializeAfterInstall() {
  await configureStorageAccess();
  await chrome.contextMenus.removeAll();
  const enabled = await getGlobalModeEnabled();
  chrome.contextMenus.create({
    id: GLOBAL_MODE_MENU_ID,
    title: t("globalMenuTitle", null, "全局翻译（自动在所有网页开启）"),
    type: "checkbox",
    checked: enabled,
    contexts: ["action"]
  });
  await globalMode.restore();
}

function respond(sendResponse, operation) {
  operation()
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({
      ok: false,
      error: error?.message || t("requestFailed", null, "请求失败")
    }));
}

function ensurePageSender(sender) {
  if (!sender.tab?.id || !sender.url || !/^https?:/i.test(sender.url)) {
    throw new Error(t("invalidPageRequest", null, "无效的页面请求"));
  }
}

async function getEnabledTabs() {
  await tabStateQueue;
  const data = await chrome.storage.session.get(ENABLED_TABS_KEY);
  return { ...(data[ENABLED_TABS_KEY] ?? {}) };
}

async function updateTabState(tabId, enabled) {
  const operation = async () => {
    const data = await chrome.storage.session.get(ENABLED_TABS_KEY);
    const enabledTabs = { ...(data[ENABLED_TABS_KEY] ?? {}) };
    if (enabled) enabledTabs[tabId] = true;
    else delete enabledTabs[tabId];
    await chrome.storage.session.set({ [ENABLED_TABS_KEY]: enabledTabs });
    return enabledTabs;
  };

  tabStateQueue = tabStateQueue.then(operation, operation);
  return tabStateQueue;
}

async function clearEnabledTabs() {
  const operation = async () => {
    await chrome.storage.session.set({ [ENABLED_TABS_KEY]: {} });
  };
  tabStateQueue = tabStateQueue.then(operation, operation);
  return tabStateQueue;
}

async function removeTabState(tabId) {
  await updateTabState(tabId, false);
}

async function disableTab(tabId) {
  await removeTabState(tabId);
  await Promise.allSettled([
    setActionState(tabId, false),
    sendToTabQuietly(tabId, { type: MESSAGE.SET_ENABLED, enabled: false })
  ]);
}

async function enableTab(tab, { reportErrors = false } = {}) {
  if (!tab?.id || !isSupportedPageUrl(tab.url)) return false;
  const settings = await getSettings();
  if (!hasApiKey(settings)) return false;

  try {
    await activatePage({
      inject: () => chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [
          "src/selection-core.js",
          "src/card-lifecycle.js",
          "src/runtime-core.js",
          "src/content.js"
        ]
      }),
      enablePage: () => sendToTab(tab.id, { type: MESSAGE.SET_ENABLED, enabled: true }),
      persistEnabled: () => updateTabState(tab.id, true),
      updateAction: () => setActionState(tab.id, true),
      notifyPageError: (message) => sendToTab(tab.id, {
        type: MESSAGE.SHOW_ERROR,
        message
      })
    });
    return true;
  } catch (error) {
    await removeTabState(tab.id).catch(() => {});
    await setActionState(tab.id, false).catch(() => {});
    if (reportErrors) {
      const message = error?.message || t("extensionEnableFailed", null, "扩展启用失败");
      await showActionError(tab.id, message);
      await sendToTabQuietly(tab.id, { type: MESSAGE.SHOW_ERROR, message });
    }
    return false;
  }
}

async function handleTabUpdated(tabId, changeInfo, tab) {
  if (changeInfo.status === "loading") {
    await disableTab(tabId);
    return;
  }
  if (changeInfo.status !== "complete") return;
  if (!await getGlobalModeEnabled()) return;
  await enableTab(tab);
}

async function enableAllSupportedTabs() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (isSupportedPageUrl(tab.url)) await enableTab(tab);
  }
}

async function disableAllTabs() {
  const enabledTabs = await getEnabledTabs();
  await clearEnabledTabs();
  await Promise.allSettled(Object.keys(enabledTabs).map(async (value) => {
    const tabId = Number(value);
    await Promise.allSettled([
      setActionState(tabId, false),
      sendToTabQuietly(tabId, { type: MESSAGE.SET_ENABLED, enabled: false })
    ]);
  }));
}

async function getGlobalModeEnabled() {
  const data = await chrome.storage.local.get(GLOBAL_MODE_STORAGE_KEY);
  return Boolean(data[GLOBAL_MODE_STORAGE_KEY]);
}

async function saveGlobalModeEnabled(enabled) {
  await chrome.storage.local.set({ [GLOBAL_MODE_STORAGE_KEY]: Boolean(enabled) });
}

async function updateGlobalMenu(enabled) {
  await chrome.contextMenus.update(GLOBAL_MODE_MENU_ID, { checked: Boolean(enabled) });
}

async function setActionState(tabId, enabled) {
  await Promise.all([
    setToolbarIcon({ action: chrome.action, tabId, enabled }),
    chrome.action.setBadgeText({ tabId, text: enabled ? "ON" : "" }),
    chrome.action.setBadgeBackgroundColor({ tabId, color: enabled ? "#22A06B" : "#7A8290" }),
    chrome.action.setTitle({
      tabId,
      title: enabled
        ? t("actionDisable", null, "关闭划词翻译")
        : t("actionEnable", null, "开启划词翻译")
    })
  ]);
}

async function showNeedsSettings(tabId) {
  await Promise.all([
    chrome.action.setBadgeText({ tabId, text: "?" }),
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#E59A21" }),
    chrome.action.setTitle({
      tabId,
      title: t("actionNeedsApiKey", null, "请先配置 DeepSeek API Key")
    })
  ]);
}

async function showUnsupportedPage(tabId) {
  await Promise.all([
    setToolbarIcon({ action: chrome.action, tabId, enabled: false }),
    chrome.action.setBadgeText({ tabId, text: "" }),
    chrome.action.setTitle({
      tabId,
      title: t("actionUnsupported", null, "当前页面不支持 EasyTranslate")
    })
  ]);
}

async function showGlobalPermissionDenied(tabId) {
  await Promise.all([
    setToolbarIcon({ action: chrome.action, tabId, enabled: false }),
    chrome.action.setBadgeText({ tabId, text: "?" }),
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#E59A21" }),
    chrome.action.setTitle({
      tabId,
      title: t("actionPermissionDenied", null, "未授予全局网页访问权限")
    })
  ]);
}

async function showActionError(tabId, title) {
  await Promise.all([
    chrome.action.setBadgeText({ tabId, text: "!" }),
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#D64545" }),
    chrome.action.setTitle({
      tabId,
      title: t("actionEnableFailed", title, `启用失败：${title}`).slice(0, 180)
    })
  ]);
}

async function sendToTab(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message);
}

async function sendToTabQuietly(tabId, message) {
  try {
    await sendToTab(tabId, message);
  } catch {
    // 页面跳转期间接收端可能已经销毁，状态清理由 tabs.onUpdated 处理。
  }
}
