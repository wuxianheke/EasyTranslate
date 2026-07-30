import { t } from "./i18n.js";

export async function activatePage({
  inject,
  enablePage,
  persistEnabled,
  updateAction,
  notifyPageError
}) {
  try {
    await inject();
  } catch (error) {
    throw new PageActivationError(
      "inject",
      t(
        "pageScriptInjectionFailed",
        error?.message || t("unknownError", null, "未知错误"),
        `页面脚本注入失败：${error?.message || "未知错误"}`
      )
    );
  }
  await enablePage();

  const warnings = [];
  await runOptionalStep(
    persistEnabled,
    t("enabledStateSaveFailed", null, "扩展已开启，但启用状态保存失败"),
    warnings,
    notifyPageError
  );
  await runOptionalStep(
    updateAction,
    t("enabledToolbarUpdateFailed", null, "扩展已开启，但工具栏状态更新失败"),
    warnings,
    notifyPageError
  );

  return { enabled: true, warnings };
}

export class PageActivationError extends Error {
  constructor(stage, message) {
    super(message);
    this.name = "PageActivationError";
    this.stage = stage;
  }
}

async function runOptionalStep(operation, label, warnings, notifyPageError) {
  try {
    await operation();
  } catch (error) {
    const detail = error?.message || t("unknownError", null, "未知错误");
    const message = t("enabledWithWarning", [label, detail], `${label}：${detail}`);
    warnings.push(message);
    try {
      await notifyPageError(message);
    } catch {
      // 页面已成功启用；提示失败不能反过来让启用流程失败。
    }
  }
}
