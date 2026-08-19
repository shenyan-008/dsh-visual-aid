# AGENTS.md — @sy008/dsh-visual-aid（Host）

本文件是 `dsh-visual-aid` Host 端包的说明。权威开发指南见 `packages/visual-aid/AGENTS.md`。

## 范围

- `src/index.ts` — 插件生命周期、工具、投影、存储、分支继承。
- `src/channel.ts` — 图片收集、替换、视觉请求构建。
- `src/config.ts` — 配置结构。
- `tests/` — 单元与集成测试。

## 关键规则

- 不修改 dsh 核心源码。
- 所有插件文件保持在 `packages/visual-aid/` 内。
- 保持 `~/.dsh/visual-aid/` 下的磁盘格式兼容。
- 关闭（`enabled=false`）即完全停用：图片事件与 `settleDescriptions` 必须先检查 `enabledFor`，顶部关闭与设置页保持同步。

## 常用命令

```bash
# 类型检查
pnpm exec tsc -p packages/visual-aid/visual-aid/tsconfig.json --noEmit

# 测试
./node_modules/.bin/vitest run packages/visual-aid/visual-aid/tests --config vitest.config.ts

# 构建 host bundle
pnpm exec tsdown --env.DSH_BUILD_FACE host
```
