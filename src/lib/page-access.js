export function isSupportedPageUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.hostname === "chromewebstore.google.com") return false;
    if (url.hostname === "chrome.google.com" && url.pathname.startsWith("/webstore")) return false;
    return true;
  } catch {
    return false;
  }
}
