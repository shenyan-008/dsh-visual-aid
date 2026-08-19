# @sy008/dsh-visual-aid

`dsh-visual-aid` 的 Host 端包，提供运行时行为：图片收集、视觉模型委托、请求投影、工具、存储和分支继承。

本包是 dsh 插件 bundle 的组成部分，通常与 `@sy008/dsh-client-ui-visual-aid` 一起通过薄 bundle 包安装。

## 功能

- 监听 `llm/stream`，在请求到达纯文本主模型前，把图片块替换为带编号的文字占位符。
- 提供 `view_image(#N, question)` 用于追问图片。
- 提供 `visual_read_image(path)` 用于从磁盘读取图片文件。
- 将会话级图片描述和 QA 历史保存到 `~/.dsh/visual-aid/`（Windows: `%USERPROFILE%\.dsh\visual-aid\`）。
- 插件已安装时，fork 会继承父会话数据。
- 提供“多模态伪装”开关，可让纯文本主模型通过模型切换检查（高风险，需配合本插件正常使用）。

## 使用

在 dsh Web 设置中启用，或使用：

```text
/visual-aid on
```

在“视觉辅助 / Visual Aid”设置区配置一个支持图片输入的视觉模型。如果没有配置模型，插件保持 inert（不生效）。

## 开发

完整开发指南见 `packages/visual-aid/README.md` 和 `packages/visual-aid/AGENTS.md`。

## 许可证

MIT，与 deepseek-harness 一致。
