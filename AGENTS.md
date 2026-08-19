# AGENTS.md — dsh-visual-aid

本文档供 AI Agent 和维护者阅读，用于在 `packages/visual-aid/` 目录下开发本插件。

## 目标

`dsh-visual-aid` 是 dsh 的纯插件 bundle。它让纯文本主模型也能处理包含图片的会话，方式是把图片理解委托给配置好的视觉模型。

## 铁律

- **不得修改 dsh 核心源码。** 所有改动必须位于 `packages/visual-aid/` 内。
- 必须保持可通过 `dsh plugin add` 安装。
- 不依赖 dsh 私有/内部 API，除非本插件已经使用且有测试覆盖。
- 必须兼容 `~/.dsh/visual-aid/`（Windows: `%USERPROFILE%\.dsh\visual-aid\`） 下已有的会话数据。

## 目录结构

```text
packages/visual-aid/
├── README.md
├── AGENTS.md
├── visual-aid/                  # Host 插件
│   ├── src/index.ts             # 生命周期、工具、投影、存储、分支继承
│   ├── src/channel.ts           # 图片收集、替换、视觉请求构建
│   ├── src/config.ts            # 配置结构
│   └── tests/
└── client-ui-visual-aid/        # Web 客户端插件
    ├── src/
    └── tests/
```

## 核心概念

### Host 插件（`visual-aid`）

- 全局监听 `llm/stream`，使用 `{ global: true }`。
- 当请求包含图片块时：
  1. 从会话收集图片记录；
  2. 调用配置的视觉模型描述未处理图片；
  3. 把图片块替换为带编号的文字占位符；
  4. 将替换后的请求交给原主模型。
- 提供 `view_image` 和 `visual_read_image` 工具。
- 将会话级 visual-aid 数据保存到 `~/.dsh/visual-aid/<session-id>.json`（Windows: `%USERPROFILE%\.dsh\visual-aid\<session-id>.json`）。
- 在 `session/created` 时，如果新会话存在 `parentSession`，会复制父会话的 visual-aid 数据到子会话。这是“分支继承”功能。
- 提供“多模态伪装”开关：开启后会 patch `ctx.llm.resolveModelInfo`，让非视觉模型的纯文本主模型被报告为支持图片，从而通过 dsh 的模型切换检查。该功能是高风险 hack，必须配合 visual-aid 使用。

### 客户端插件（`client-ui-visual-aid`）

- 增加“视觉辅助 / Visual Aid”设置区。
- 增加 Web 顶部开关。
- 增加视觉对话面板。
- 拦截输入框图片粘贴，通过插件自有上传接口上传，避免纯文本主模型被正常 prompt 预检拦截。

## 重要行为

- `enabled` 但没有配置视觉模型时，按“未启用”处理。
- 关闭（`enabled=false`）时必须完全停用：`settleDescriptions` 和图片事件均先检查 `enabledFor`，顶部“关闭”与设置页“启用”保持同步；即使 provider/model 仍保留，也不得后台预处理。
- 配置的视觉模型不可用或不接受图片时，只在请求确实包含图片时才会报错；纯文本请求正常放行。
- 图片编号在压缩/compact 后保持单调递增。
- 分支继承只在插件已安装时生效。如果插件被卸载，不会自动继承。
- dsh 核心的模型切换保护会检查原始会话历史中是否有图片。本插件不能通过受支持的插件 API 绕过该保护；如果要在带图片的会话中切换纯文本模型，应使用 `/compact` 或新开会话。
- “多模态伪装”是绕过该保护的 hack，仅应在用户明确要求时启用；必须确保 visual-aid 同时正常工作，否则会把图片透传给纯文本模型。

## 踩坑记录

- **DeepSeek 纯文本模型不能接收图片。** 插件未启用、未配置视觉模型或未正确安装时，图片会透传并报 `UNSUPPORTED_CONTENT`。
- **模型切换保护无法被插件绕过。** 核心 `selectModel` 检查原始会话历史中的图片；visual-aid 只能拦截 LLM 请求，不能改变该检查。用户侧应使用 `/compact` 或新会话。
- **分支继承依赖插件已安装。** 卸载插件后不会自动继承；关闭设置但插件仍安装时，会继承但不会使用，重新开启后可复用。
- **分支点早于描述生成时无法继承。** 需要从较新的断点分支，或手动复制 `~/.dsh/visual-aid/<父session-id>.json`（Windows: `%USERPROFILE%\.dsh\visual-aid\<父session-id>.json`） 到子 session。
- **同版本重装可能不生效。** 修改插件后应升级版本号，必要时删除 profile 的 `pnpm-lock.yaml` 再重装。
- **插件数据文件是用户资产。** 不要随意删除 `~/.dsh/visual-aid/`（Windows: `%USERPROFILE%\.dsh\visual-aid\`），否则会丢失已生成的图片描述和 QA 历史。
- **多模态伪装是高风险 hack。** 它 patch 了 `ctx.llm.resolveModelInfo`，让纯文本模型显示为支持图片；如果 visual-aid 未生效，用户切到该模型后仍会收到 `UNSUPPORTED_CONTENT`。

## 开发流程

### 安装依赖

```bash
pnpm install
```

### 类型检查

```bash
pnpm exec tsc -p packages/visual-aid/visual-aid/tsconfig.json --noEmit
pnpm exec tsc -p packages/visual-aid/client-ui-visual-aid/tsconfig.json --noEmit
```

### 测试

```bash
./node_modules/.bin/vitest run packages/visual-aid/visual-aid/tests --config vitest.config.ts
./node_modules/.bin/vitest run packages/visual-aid/client-ui-visual-aid/tests --config vitest.config.ts
```

### 构建

```bash
# Host
pnpm exec tsdown --env.DSH_BUILD_FACE host

# Client
pnpm exec tsdown --env.DSH_BUILD_FACE client
```

### 打包本地可安装 bundle

发布产物是一个薄 bundle 包，依赖 host 和 client 的 tarball。典型本地打包流程：

```bash
# 1. 打包 host
cd packages/visual-aid/visual-aid
pnpm pack --pack-destination /tmp/va-final

# 2. 打包 client
cd ../client-ui-visual-aid
pnpm pack --pack-destination /tmp/va-final

# 3. 创建 bundle 目录，包含 cordis.patch.yml 和 package.json：
#    name: dsh-visual-aid-bundle
#    dependencies:
#      @sy008/dsh-visual-aid: file:/tmp/va-final/<host>.tgz
#      @sy008/dsh-client-ui-visual-aid: file:/tmp/va-final/<client>.tgz
#    dsh.bundle.patch: ./cordis.patch.yml

# 4. 安装到 profile
dsh plugin --profile web add file:/path/to/bundle
```

## 当前状态

- Host 和 client 包均已实现并有测试覆盖。
- 分支继承已实现，并有回归测试。
- 已验证本地打包 + profile 安装。
- 已发布到公共 npm registry：`@sy008/dsh-visual-aid`、`@sy008/dsh-client-ui-visual-aid`、`@sy008/dsh-visual-aid-bundle`，当前版本 `0.1.0-rc.8`。

## 发布前检查

- [ ] 更新 `packages/visual-aid/visual-aid/package.json` 和 `packages/visual-aid/client-ui-visual-aid/package.json` 的版本号。
- [ ] 运行完整测试。
- [ ] 运行 host/client 类型检查和 lint。
- [ ] 用打包 tarball 在干净 profile 中验证安装。
- [ ] 确认 `README.md` 中的安装命令与发布后的真实包名一致。
- [ ] 确认 LICENSE 与 deepseek-harness 一致（MIT）。


## 发布前强制检查（踩坑记录，必须逐项通过）

> 以下每一项都曾经导致过线上事故，发布前必须执行。

### 1. 包名必须是 @sy008
- `visual-aid/package.json` → `@sy008/dsh-visual-aid`
- `client-ui-visual-aid/package.json` → `@sy008/dsh-client-ui-visual-aid`
- `bundle/package.json` → `@sy008/dsh-visual-aid-bundle`
- 不得出现 `@deepseek-ai/dsh-visual-aid` 作为发布包名。

### 2. 版本号必须递增
- 三个 `package.json` 的 `version` 必须一致且是**新版本**（已发布版本不能覆盖）。
- `bundle/package.json` 的 dependencies 必须指向**同版本** `@sy008/*`。

### 3. cordis.patch.yml 必须指向 @sy008
- `bundle/cordis.patch.yml`
- `visual-aid/cordis.patch.yml`
- 两处都必须写：
  ```yaml
  name: '@sy008/dsh-visual-aid'
  name: '@sy008/dsh-client-ui-visual-aid'
  ```
- 踩坑：rc.6 这里写成 `@deepseek-ai`，导致 Windows 启动 `Cannot find package '@deepseek-ai/dsh-visual-aid'`。

### 4. client bundle ID 必须与包名一致
- `client-ui-visual-aid/tsdown.config.ts` 必须写：
  ```ts
  clientBundle('@sy008/dsh-client-ui-visual-aid', ...)
  ```
- 重新构建后必须检查 `lib/client.js` 里出现 `@sy008/dsh-client-ui-visual-aid`，且**不出现** `@deepseek-ai/dsh-client-ui-visual-aid`。
- 踩坑：rc.7 这里还是 `@deepseek-ai`，导致浏览器加载报 `loaded without registering "@sy008/dsh-client-ui-visual-aid"`。

### 5. 不允许发布的文件
- 不得有 `node_modules/`
- 不得有 `*.map`
- 不得有 `*.tsbuildinfo`
- 不得有 `.env`、密钥、token
- 用 `npm pack` 实际解压检查 tarball 内容。

### 6. 文档版本必须同步
- `README.md`、`AGENTS.md`、`bundle/README.md`、`visual-aid/README.md`、`client-ui-visual-aid/README.md`、`visual-aid/AGENTS.md`
- 安装命令必须写 `@sy008/dsh-visual-aid-bundle@<新版本>`。
- 不得残留旧版本号（如 rc.6 / rc.7）。

### 7. 功能修复必须在构建产物中
- host `visual-aid/lib/index.js` 必须包含关闭检查：
  ```js
  if (!this.enabledFor(session)) return;
  ```
- client `client-ui-visual-aid/lib/client.js` 必须包含设置页同步逻辑：
  ```js
  syncEnabled
  ```

### 8. 实际发布前验证
```bash
cd /tmp/dsh-visual-aid
# 检查版本
grep -H '"version"' visual-aid/package.json client-ui-visual-aid/package.json bundle/package.json
# 检查 patch
cat bundle/cordis.patch.yml visual-aid/cordis.patch.yml
# 检查 client ID
grep -o "@sy008/dsh-client-ui-visual-aid\|@deepseek-ai/dsh-client-ui-visual-aid" client-ui-visual-aid/lib/client.js | sort | uniq -c
# 实际打包
(cd bundle && npm pack --pack-destination /tmp/check --cache /tmp/npm-cache-sy)
(cd visual-aid && npm pack --pack-destination /tmp/check --cache /tmp/npm-cache-sy)
(cd client-ui-visual-aid && npm pack --pack-destination /tmp/check --cache /tmp/npm-cache-sy)
# 解压检查
for tgz in /tmp/check/*.tgz; do tar -tzf "$tgz" | grep -E '\.map$|tsbuildinfo|node_modules|\.env|@deepseek-ai' && echo "FAIL $tgz" || echo "OK $tgz"; done
```

### 9. 发布顺序
1. `git add -A && git commit && git tag v<新版本>`
2. `git push origin main && git push origin v<新版本>`
3. `npm publish` 顺序：visual-aid → client-ui-visual-aid → bundle
4. `npm dist-tag add <pkg>@<新版本> next`（如果 latest 已通过 `--tag latest` 设置）
5. 验证 dist-tags：`latest` 和 `next` 都指向新版本
6. GitHub Release（Pre-release）
