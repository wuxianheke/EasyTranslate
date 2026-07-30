<div align="center">
  <img src="assets/icon-on-128.png" width="96" height="96" alt="EasyTranslate 图标" />
  <h1>EasyTranslate</h1>
  <p>主动开启、结合上下文的 Chrome 网页划词翻译扩展。</p>
</div>

> 当前版本优先支持 DeepSeek API，并为后续接入其他翻译服务预留了适配层。

## 功能

- 左键工具栏图标，只开启或关闭当前页面。
- 在设置页使用 Switch，或右键图标勾选菜单，开启全局翻译。
- 界面支持简体中文和英语，并跟随 Chrome 的界面语言；其他语言环境默认显示中文。
- 选择文字后，在选区附近显示简洁译文。
- 短段落会作为完整上下文；长内容只截取选区前后各 10 个词。
- 基础译文按页面缓存 2 天；相同选词可直接读取本地结果。
- “更多”提供其他常用意思和一个简短的中英双语例句，且不会缓存。
- 翻译卡片 10 秒后自动关闭；点击卡片内容或右上角 `×` 可立即关闭。
- 页面或请求出错时，在网页右上角显示提示。

## 当前状态

这是一个可直接加载的 Manifest V3 扩展，不需要构建步骤。当前版本为 `0.1.0`，建议先以“加载已解压的扩展程序”的方式使用和测试。

## 安装

1. 下载或克隆本仓库。
2. 在 Chrome 地址栏打开 `chrome://extensions/`。
3. 开启右上角的“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择包含 `manifest.json` 的项目根目录。
6. 建议把 EasyTranslate 固定到浏览器工具栏。

重新拉取代码或修改扩展后，需要在 `chrome://extensions/` 中点击“重新加载”。如果修改涉及页面脚本，还应刷新已经打开的网页。

## 配置

1. 右键扩展图标，选择“选项”；也可以在扩展管理页进入“扩展程序选项”。
2. 选择 DeepSeek 模型。
3. 填写自己的 DeepSeek API Key。
4. 设置原语言和目标语言。默认是英语翻译为简体中文。
5. 点击“测试连接”，确认配置可用。
6. 点击“保存设置”。

API Key 只保存在本机的 `chrome.storage.local`，不会进入源码，也不会通过 Chrome Sync 同步。请勿把真实 API Key 写进代码、截图、Issue 或提交记录。

## 使用方式

### 当前页面模式

左键点击灰色扩展图标即可开启当前页面。开启后图标变为彩色，并显示绿色 `ON` 标记；再次左键点击会关闭当前页面。

全局模式关闭时，页面刷新或跳转后，当前页面模式会自动关闭。

### 全局模式

可以通过任一入口开启：

- 在设置页打开“全局翻译”Switch。
- 右键扩展图标，勾选“全局翻译（自动在所有网页开启）”。

Switch 与右键菜单状态会自动同步。首次开启时，Chrome 会询问是否允许扩展访问普通网页。取消全局模式后，扩展会停用已开启的页面，并撤回这项可选网页权限。

在全局模式下，仍可左键图标单独关闭当前页面；该页面发生刷新或跳转后，会按全局模式重新开启。

### 翻译与“更多”

1. 在已开启的页面选择文字。
2. 等待译文出现在选区附近。
3. 需要扩展释义时，点击“更多”。
4. 点击卡片内容或 `×` 立即关闭，也可等待卡片在 10 秒后自动消失。“更多”按钮不会触发卡片关闭。

基础译文会读取和写入本地缓存。“更多”每次都会重新请求模型，不读取也不写入基础译文缓存。

## 上下文与缓存规则

- 选中文字会先去除首尾空白，并按完整内容精确匹配；`supported` 不会命中 `supported languages`。
- 当所在文本块不超过 120 个词且不超过 800 个字符时，会把该文本块作为上下文。
- 当内容较长时，只使用选区前后各 10 个词作为参考。
- 缓存按页面地址、完整选词、上下文、语言方向、模型和提示词版本区分。
- 页面地址的 `#fragment` 不参与缓存键，查询参数会保留。
- 基础译文缓存有效期为 2 天；每页最多保留 300 条，总计最多保留 3000 条。
- 所有缓存都保存在浏览器本地扩展存储中。

## 支持与限制

支持普通 `http://` 和 `https://` 网页。

以下页面受 Chrome 安全机制限制，不能注入翻译脚本：

- `chrome://` 浏览器内部页面。
- `chrome-extension://` 扩展内部页面，包括本扩展设置页。
- Chrome 应用商店页面。
- 其他由浏览器或企业策略禁止扩展访问的页面。

扩展当前仅接入 DeepSeek。模型请求可能产生费用，并受 DeepSeek 的额度、速率限制和服务可用性影响。

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `activeTab` | 用户左键图标后，临时访问当前标签页。 |
| `scripting` | 向用户主动开启的网页注入划词翻译脚本。 |
| `storage` | 保存设置、API Key、全局模式状态和翻译缓存。 |
| `contextMenus` | 在扩展图标右键菜单中提供全局模式开关。 |
| `https://api.deepseek.com/*` | 调用 DeepSeek API。 |
| 可选的 `http://*/*`、`https://*/*` | 仅在用户开启全局模式时申请，用于自动启用普通网页。 |

更完整的数据说明见 [隐私说明](docs/PRIVACY.md)。

## 常见问题

### 点击图标提示“当前页面不支持 EasyTranslate”

确认当前标签页是普通网页，而不是扩展设置页、`chrome://` 页面或 Chrome 应用商店。

### 出现 `Extension context invalidated`

这通常发生在开发期间重新加载扩展后，旧网页仍保留上一版本的页面脚本。当前版本会让失效脚本静默退出；首次升级到该版本时，请手动刷新已打开的网页一次。

### GitHub 等普通网站提示无法访问页面

先重新加载扩展并刷新网页，然后再左键图标。全局模式还需要在 Chrome 的权限弹框中允许网页访问。

### 翻译成功，但工具栏图标状态异常

重新加载扩展并刷新页面。若仍能复现，请在 Issue 中提供 Chrome 版本、扩展版本、页面类型和错误文字，但不要提供 API Key。

### DeepSeek 请求失败

- `401/403`：检查 API Key。
- `429`：请求过于频繁或额度受限，请稍后重试。
- 超时或无法连接：检查网络和 DeepSeek 服务状态。

## 本地开发

推荐使用 Node.js 20 或更高版本运行检查：

```bash
npm run check
```

也可以只运行测试：

```bash
npm test
```

项目没有运行时 npm 依赖，也没有打包步骤。详细架构、修改入口和发布检查见 [开发说明](docs/DEVELOPMENT.md)。

## 项目结构

```text
.
├── assets/                 # 工具栏和扩展图标
├── docs/                   # 隐私与开发文档
├── src/
│   ├── background.js       # Service Worker、标签页与全局模式协调
│   ├── content.js          # 选区监听、翻译卡片和错误提示
│   ├── selection-core.js   # 选词与上下文提取
│   ├── card-lifecycle.js   # 卡片自动关闭逻辑
│   ├── runtime-core.js     # 失效扩展上下文识别
│   ├── lib/                # API、缓存、设置、提示词和状态模块
│   └── options/            # 设置页面
├── tests/                  # Node.js 回归测试
├── manifest.json
└── package.json
```

## 参与贡献

提交改动前请运行 `npm run check`。Bug 报告和 Pull Request 的注意事项见 [贡献指南](CONTRIBUTING.md)，安全问题请阅读 [安全策略](SECURITY.md)。

## 相关文档

- [Chrome：`activeTab` 权限](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [Chrome：声明权限与可选权限](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- [Chrome：Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [DeepSeek API 文档](https://api-docs.deepseek.com/)

## 开源许可证

本项目采用 [MIT License](LICENSE)。
