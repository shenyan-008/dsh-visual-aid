# @sy008/dsh-client-ui-visual-aid

`dsh-visual-aid` 的 Web 客户端包，提供以下界面能力：

- “视觉辅助 / Visual Aid”设置区。
- Web 顶部开关，用于按会话启用/禁用视觉辅助。
- 视觉对话面板，展示图片 QA 历史、丢弃警告和 Token 统计。
- 输入框图片粘贴拦截，通过插件自有上传接口上传，避免纯文本主模型被正常 prompt 预检拦截。
- 设置页提供独立的“多模态伪装”开关。

本包通常与 `@sy008/dsh-visual-aid` 一起通过薄 bundle 包安装。

## 开发

完整开发指南见 `packages/visual-aid/README.md` 和 `packages/visual-aid/AGENTS.md`。

## 许可证

MIT，与 deepseek-harness 一致。
