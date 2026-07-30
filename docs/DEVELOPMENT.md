# 开发说明

## 环境要求

- Chrome 102 或更高版本。
- Node.js 20 或更高版本，用于语法检查和测试。
- 不需要安装运行时依赖，也不需要构建或打包源码。

## 开始开发

1. 在 `chrome://extensions/` 开启开发者模式。
2. 通过“加载已解压的扩展程序”选择项目根目录。
3. 修改代码后，在扩展管理页点击“重新加载”。
4. 如果修改了 `content.js`、`selection-core.js`、`card-lifecycle.js` 或 `runtime-core.js`，同时刷新测试网页。

界面文案放在 `_locales/zh_CN/messages.json` 和 `_locales/en/messages.json`。中文是默认语言；新增消息时必须同步补齐两个文件，并保持消息键一致。

开发期间重新加载扩展会使旧内容脚本的扩展上下文失效。当前版本会静默处理这一情况，但为了验证最新脚本，仍建议刷新网页。

## 架构概览

### `src/background.js`

Manifest V3 Service Worker，负责：

- 左键图标的当前标签页开关。
- 右键菜单和设置页 Switch 的全局模式。
- 可选网页权限的申请、检查与撤回。
- 页面脚本注入和标签页状态维护。
- 接收翻译、扩展释义和连接测试消息。
- 工具栏图标、Badge 和提示文字更新。

### `src/content.js`

注入到普通网页的内容脚本，负责：

- 监听鼠标和键盘选区变化。
- 显示加载、译文、“更多”和错误 UI。
- 管理 10 秒自动关闭和手动关闭。
- 在扩展上下文失效时静默退出。

内容脚本使用关闭的 Shadow DOM，尽量避免页面样式与扩展样式相互影响。

### `src/selection-core.js`

提取选中文字和上下文：

- 统一空白并去除首尾空格。
- 短文本块使用完整上下文。
- 长文本块截取选区前后各 10 个词。

### `src/lib/coordinator.js`

翻译流程协调层。负责规范化请求、读取缓存、合并并发请求、调用 API 适配器以及写入基础译文缓存。

### `src/lib/deepseek.js`

当前 API 提供方适配器。后续接入其他服务时，建议新增同等职责的适配器，并让协调层根据设置选择提供方，不要把提供方判断散落到内容脚本或设置页面。

### `src/lib/cache.js`

使用 SHA-256 生成精确缓存键，缓存基础译文 2 天。“更多”请求由协调层明确绕过缓存。

### `src/options/`

配置模型、API Key、语言方向和全局模式。全局 Switch 与右键菜单通过本地存储状态保持同步。

## 消息边界

消息类型集中定义在 `src/lib/constants.js`：

- `translator:set-enabled`
- `translator:show-error`
- `translator:translate`
- `translator:expand`
- `translator:test-api`
- `translator:get-global-mode`
- `translator:set-global-mode`

增加消息时，应同时检查发送方、Service Worker 的来源验证和错误返回格式。

## 测试

运行全部检查：

```bash
npm run check
```

只运行测试：

```bash
npm test
```

测试覆盖：

- Manifest 和文件引用。
- 工具栏图标更新。
- 页面启用与错误分级。
- 缓存键、页面范围和过期策略相关行为。
- 翻译提示词与返回解析。
- 卡片 10 秒生命周期。
- 支持页面判断。
- 全局权限与模式切换。
- 设置页 Switch 的可访问性。
- 失效扩展上下文识别。

新增 Bug 修复时，应先增加能复现用户症状的回归测试，再修改实现。

## 手动测试清单

发布或合并重要改动前，至少检查：

- 未配置 API Key 时，左键图标会打开设置页。
- 当前页面模式可以开启和关闭，图标及 `ON` Badge 正确。
- 全局 Switch 能请求权限、开启页面、关闭页面并撤回权限。
- 右键菜单与设置页 Switch 状态同步。
- 普通网页选词后显示译文，10 秒后自动关闭。
- 关闭按钮和 Escape 键可关闭翻译卡片。
- “更多”显示其他意思和双语例句。
- 相同页面、相同完整选词可以命中缓存。
- `supported` 不会命中 `supported languages`。
- `chrome://`、扩展设置页和 Chrome 应用商店不会触发注入错误。
- 重新加载扩展后，刷新网页可以继续正常翻译。

## 发布到 GitHub 前

1. 确认源码中没有 API Key、个人路径或调试日志。
2. 运行 `npm run check`。
3. 确保 `manifest.json` 和 `package.json` 版本一致。
4. 检查 README、隐私说明和权限描述是否与代码一致。
5. 确认 `LICENSE` 和 `package.json` 中的许可证信息一致。
6. 在 GitHub Release 中记录用户可见的变更和升级注意事项。

`.agents/` 和 `skills-lock.json` 是本地 AI 开发辅助文件，不参与扩展运行，已通过 `.gitignore` 排除。
