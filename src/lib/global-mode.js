export const GLOBAL_MODE_STORAGE_KEY = "globalTranslatorEnabledV1";
export const GLOBAL_MODE_MENU_ID = "toggle-global-translator";
export const GLOBAL_HOST_ORIGINS = Object.freeze(["http://*/*", "https://*/*"]);

export function createGlobalModeController({
  requestHostAccess,
  hasHostAccess,
  removeHostAccess,
  loadEnabled,
  saveEnabled,
  updateMenu,
  enableAllTabs,
  disableAllTabs
}) {
  async function applyEnabled() {
    await saveEnabled(true);
    await updateMenu(true);
    await enableAllTabs();
    return { enabled: true, permissionDenied: false };
  }

  async function enableFromUserGesture() {
    const granted = await requestHostAccess();
    if (!granted) {
      await saveEnabled(false);
      await updateMenu(false);
      return { enabled: false, permissionDenied: true };
    }

    return applyEnabled();
  }

  async function enableWithExistingAccess() {
    if (!await hasHostAccess()) {
      await saveEnabled(false);
      await updateMenu(false);
      return { enabled: false, permissionDenied: true };
    }
    return applyEnabled();
  }

  async function disable() {
    await saveEnabled(false);
    await updateMenu(false);
    await disableAllTabs();
    await removeHostAccess();
    return { enabled: false };
  }

  async function restore() {
    const enabled = await loadEnabled();
    if (!enabled) {
      await updateMenu(false);
      return { enabled: false };
    }

    if (!await hasHostAccess()) {
      await saveEnabled(false);
      await updateMenu(false);
      return { enabled: false };
    }

    await updateMenu(true);
    await enableAllTabs();
    return { enabled: true };
  }

  return { disable, enableFromUserGesture, enableWithExistingAccess, restore };
}
