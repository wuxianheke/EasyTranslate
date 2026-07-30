<div align="center">
  <img src="assets/icon-on-128.png" width="96" height="96" alt="EasyTranslate 图标" />
  <h1>EasyTranslate</h1>
  <p><strong>中文</strong> · <a href="README_EN.md">English</a></p>
  <p>一个简单的 Chrome 网页划词翻译插件。</p>
</div>

EasyTranslate 使用 DeepSeek 翻译网页中选中的文字。它不在网页上放悬浮图标，也没有花哨的附加功能，只专注于翻译。

## 特点

- **没有图标干扰**：网页上不显示悬浮图标或按钮，保持原来的阅读体验。
- **选中即翻译**：选中文字后，译文直接显示在选区旁边。
- **沉浸式体验**：弹框简洁，只显示真正需要的翻译内容，用完自动消失。
- **只做翻译**：没有广告、会员、积分或第三方增值服务，也不加入无关功能。
- **使用自己的 API**：填写自己的 DeepSeek API Key，插件直接请求 DeepSeek，不经过第三方中转服务器。
- **理解上下文**：会参考选词附近的内容，减少脱离语境的翻译。

默认从英语翻译成简体中文，也可以更改语言。点击“更多”可以查看其他意思和简单例句；基础译文会在当前网页缓存 2 天，“更多”的内容不缓存。

## 使用示例

选中即翻译 · 查看更多释义和例句

<p>
  <img src="docs/images/selection-translation.png" alt="选中文字后显示翻译" width="320" />
  &nbsp;&nbsp;
  <img src="docs/images/more-meanings.png" alt="查看更多释义和双语例句" width="320" />
</p>

设置模型、API Key 和翻译语言

<p>
  <img src="docs/images/settings.png" alt="EasyTranslate 设置页面" width="360" />
</p>

## 安装

1. 下载本项目并解压。
2. 在 Chrome 地址栏打开 `chrome://extensions/`。
3. 打开右上角的“开发者模式”。
4. 点击“加载已解压的扩展程序”。

## 使用

1. 右键插件图标，打开“选项”。
2. 选择模型，填写自己的 DeepSeek API Key，然后保存。
3. 左键插件图标，开启当前网页的划词翻译。
4. 在网页中选中文字，翻译会显示在选区旁边。

再次左键图标会关闭当前网页的翻译。想在所有普通网页中自动开启，可以在设置页打开“全局翻译”，也可以通过插件的右键菜单开启。

翻译弹框会在 10 秒后自动消失。点击弹框或右上角的 `×` 可以立即关闭，点击“更多”不会关闭弹框。

## 注意事项

- 目前只支持 DeepSeek API，调用模型可能产生费用。
- API Key 只保存在本机浏览器中，请不要把它提交到 GitHub 或发到 Issue。
- 更新代码后，需要在 `chrome://extensions/` 重新加载插件，并刷新已经打开的网页。

数据使用说明见[隐私说明](docs/PRIVACY.md)。

## 开发

本项目不需要构建。修改后运行：

```bash
npm run check
```

项目使用 [MIT License](LICENSE)。
