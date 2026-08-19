window.__ModuleLoader__.load({
	id: "@sy008/dsh-client-ui-visual-aid",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region lib/types/client/locales.js
		const NS = "settings.visualAid";
		const zh = {
			"nav": "视觉辅助",
			"sectionIntro": "配置图片描述与视觉问答所使用的视觉模型。",
			"enable": "启用视觉辅助",
			"model": "视觉模型",
			"modelEmpty": "未选择视觉模型",
			"save": "保存",
			"saving": "保存中…",
			"saved": "已保存",
			"usageTitle": "使用说明",
			"usageStep1": "在设置中启用“视觉辅助”，选择支持图片的视觉模型，然后点击保存。",
			"usageStep2": "带图片的会话会自动生成图片描述，主模型会看到文字占位符而不是原始图片。",
			"usageStep3": "如果主模型需要确认图片中的细节，可以使用 view_image(#编号, 问题) 追问。",
			"usageStep4": "分支（fork）出的新会话会继承父会话已生成的图片描述和问答记录。",
			"usageStep5": "“上下文窗口阈值”表示视觉问答最多使用视觉模型上下文窗口的比例，默认 0.85；值越大可保留越多历史问答，但也更容易超限。",
			"usageStep6": "如果超过“上下文窗口阈值”，会优先丢弃最早的视觉问答历史，再丢弃最早的图片；如果只剩一张图仍超限，view_image 会报错。",
			"noticeTitle": "注意事项",
			"notice1": "必须配置可用的视觉模型；未配置时插件按未启用处理。",
			"notice2": "“多模态伪装”是高风险选项，只应在确实需要切换纯文本模型时开启，并确保视觉辅助正常工作。",
			"notice3": "如果关闭或卸载插件，图片可能会直接发送给不支持图片的主模型并报错。",
			"notice4": "插件数据默认保存在用户主目录下的 .dsh/visual-aid/（Windows 为 %USERPROFILE%\\.dsh\\visual-aid\\），请勿随意删除。",
			"notice5": "在带图片的会话中切换纯文本模型前，建议先 /compact 或新开会话。",
			"notice6": "本插件不修改 dsh 核心源码，完全以插件形式安装。",
			"maxTokens": "回答上限 maxTokens",
			"timeoutMs": "请求超时 timeoutMs",
			"channelRatio": "上下文窗口阈值",
			"describe": "自动生成图片描述",
			"describeMaxTokens": "描述生成上限",
			"masquerade": "多模态伪装（允许纯文本模型通过切换检查）",
			"headerOn": "视觉辅助：开",
			"headerOff": "视觉辅助：关",
			"visionPanel": "视觉",
			"visionEmpty": "暂无视觉问答",
			"viewVisual": "视觉",
			"exportJson": "导出 JSON",
			"exportMarkdown": "导出 Markdown",
			"mainRequest": "主模型请求",
			"defaultEffort": "默认",
			"statusDescribing": "视觉 · 预处理中…",
			"statusQuerying": "视觉 · 问答中…",
			"statusOff": "视觉 · 关闭",
			"reasoningLevel": "推理等级",
			"contextUsed": "视觉上下文已用 {percent}%",
			"officialContext": "官方返回上下文 ~{value}",
			"describeTitle": "图片转描述（预处理）",
			"describeProcessed": "已处理 {count} 张图片",
			"cumulativeStats": "累计：输入 ~{input} · 输出 ~{output} · 耗时 ~{seconds}s",
			"latestStats": "最近一次：输入 ~{input} · 输出 ~{output} · 耗时 ~{seconds}s",
			"statsSummary": "{answered} 次问答 · {steps} 步 · LLM {seconds}s · 工具 {toolMs}ms · 输入 {input} tok · 输出 {output} tok · 缓存读 {cacheRead} / 写 {cacheWrite}",
			"imageSummary": "图片 #{no}：{summary}",
			"imageDescribeFailed": "图片 #{no} 描述失败：{message}",
			"exportMarkdownTitle": "# 视觉辅助会话 {sessionId}",
			"exportMarkdownOperations": "## 操作",
			"exportMarkdownStats": "## 统计",
			"mdSteps": "- 步数：{value}",
			"mdAnswered": "- 已回答：{value}",
			"mdInputTokens": "- 输入 tokens：{value}",
			"mdOutputTokens": "- 输出 tokens：{value}",
			"mdCacheRead": "- 缓存读取：{value}",
			"mdCacheWrite": "- 缓存写入：{value}",
			"mdLlmTime": "- LLM 耗时：{value}ms",
			"rowQuestion": "问",
			"rowAnswer": "答",
			"rowDescription": "描",
			"rowWarning": "⚠",
			"qaTitle": "视觉问答",
			"qaCount": "已问答 {count} 次",
			"back": "‹ 返回",
			"close": "关闭",
			"turnUnknown": "未记录轮次",
			"turnLabel": "第 {turn} 轮",
			"expand": "展开",
			"collapse": "收起",
			"opToggleOn": "视觉辅助已开启",
			"opToggleOff": "视觉辅助已关闭",
			"opImageAdded": "图片 #{no} 已添加（{name}）",
			"opDescribeStart": "正在为图片 #{no} 生成文字描述",
			"opDescribeEnd": "图片 #{no} 描述完成\n\n**最终描述：**\n{summary}\n\n**思考过程：**\n{rawSummary}",
			"opDescribeFailed": "图片 #{no} 描述失败：{message}",
			"opQueryAsked": "针对图片 {nos} 发起问答：{question}",
			"opQueryAnswered": "回答：{answer}",
			"opQueryFailed": "问答失败：{message}",
			"opWarning": "警告：{message}",
			"opToolInvoked": "调用工具 {tool}，针对图片 {nos}\n{detail}",
			"opMainRequest": "主模型请求 imageCount={count} replacedCount={replaced}\n\n{preview}",
			"opLabelToggle": "开关",
			"opLabelImageAdded": "图片已添加",
			"opLabelDescribeStart": "开始图片转描述",
			"opLabelDescribeEnd": "图片转描述完成",
			"opLabelDescribeFailed": "图片转描述失败",
			"opLabelQueryAsked": "发起视觉问答",
			"opLabelQueryAnswered": "视觉问答完成",
			"opLabelQueryFailed": "视觉问答失败",
			"opLabelWarning": "警告",
			"opLabelToolInvoked": "调用工具",
			"opLabelMainRequest": "主模型请求"
		};
		const en = {
			"nav": "Visual Aid",
			"sectionIntro": "Configure the vision model used for image descriptions and visual Q&A.",
			"enable": "Enable visual aid",
			"model": "Vision model",
			"modelEmpty": "No vision model selected",
			"save": "Save",
			"saving": "Saving…",
			"saved": "Saved",
			"usageTitle": "Usage",
			"usageStep1": "Enable Visual Aid in settings, choose an image-capable vision model, then click Save.",
			"usageStep2": "Image-bearing sessions are automatically described; the main model sees text placeholders instead of raw images.",
			"usageStep3": "If the main model needs to verify a detail in an image, it can use view_image(#N, question).",
			"usageStep4": "Forked sessions inherit the parent session’s generated image descriptions and Q&A history.",
			"usageStep5": "“Context window threshold” controls how much of the vision model’s context window visual Q&A may use (default 0.85); a larger value keeps more history but may exceed the limit.",
			"usageStep6": "If the “Context window threshold” is exceeded, the oldest visual Q&A history is dropped first, then the oldest images; if even one image still exceeds the limit, view_image fails.",
			"noticeTitle": "Important Notes",
			"notice1": "A usable vision model is required; without one the plugin stays disabled.",
			"notice2": "“Multimodal masquerade” is a high-risk option; enable it only when you must switch to a text-only model and Visual Aid is working correctly.",
			"notice3": "If the plugin is disabled or uninstalled, images may be sent directly to a text-only main model and cause errors.",
			"notice4": "Plugin data is stored by default under .dsh/visual-aid in the user home directory (Windows: %USERPROFILE%\\.dsh\\visual-aid\\). Do not delete it casually.",
			"notice5": "Before switching to a text-only model in an image session, use /compact or start a new session.",
			"notice6": "This plugin does not modify dsh core source; it installs purely as a plugin.",
			"maxTokens": "Answer cap maxTokens",
			"timeoutMs": "Request timeout timeoutMs",
			"channelRatio": "Context window threshold",
			"describe": "Generate image descriptions automatically",
			"describeMaxTokens": "Description cap",
			"masquerade": "Multimodal masquerade (allow text-only models through model switching)",
			"headerOn": "Visual aid: on",
			"headerOff": "Visual aid: off",
			"visionPanel": "Vision",
			"visionEmpty": "No vision conversation yet",
			"viewVisual": "Visual",
			"exportJson": "Export JSON",
			"exportMarkdown": "Export Markdown",
			"mainRequest": "Main Request",
			"defaultEffort": "Default",
			"statusDescribing": "Visual · Preprocessing…",
			"statusQuerying": "Visual · QA…",
			"statusOff": "Visual · Off",
			"reasoningLevel": "Reasoning Level",
			"contextUsed": "Visual context used {percent}%",
			"officialContext": "Official context ~{value}",
			"describeTitle": "Image to Description (Preprocessing)",
			"describeProcessed": "Processed {count} images",
			"cumulativeStats": "Cumulative: input ~{input} · output ~{output} · time ~{seconds}s",
			"latestStats": "Latest: input ~{input} · output ~{output} · time ~{seconds}s",
			"statsSummary": "{answered} QA · {steps} steps · LLM {seconds}s · tool {toolMs}ms · in {input} tok · out {output} tok · cache R {cacheRead} / W {cacheWrite}",
			"imageSummary": "Image #{no}: {summary}",
			"imageDescribeFailed": "Image #{no} description failed: {message}",
			"exportMarkdownTitle": "# Visual Aid Session {sessionId}",
			"exportMarkdownOperations": "## Operations",
			"exportMarkdownStats": "## Stats",
			"mdSteps": "- Steps: {value}",
			"mdAnswered": "- Answered: {value}",
			"mdInputTokens": "- Input tokens: {value}",
			"mdOutputTokens": "- Output tokens: {value}",
			"mdCacheRead": "- Cache read: {value}",
			"mdCacheWrite": "- Cache write: {value}",
			"mdLlmTime": "- LLM time: {value}ms",
			"rowQuestion": "Q",
			"rowAnswer": "A",
			"rowDescription": "D",
			"rowWarning": "⚠",
			"qaTitle": "Visual QA",
			"qaCount": "Answered {count} times",
			"back": "‹ Back",
			"close": "Close",
			"turnUnknown": "Unknown turn",
			"turnLabel": "Turn {turn}",
			"expand": "Expand",
			"collapse": "Collapse",
			"opToggleOn": "Visual aid enabled",
			"opToggleOff": "Visual aid disabled",
			"opImageAdded": "Image #{no} added ({name})",
			"opDescribeStart": "Describing image #{no}",
			"opDescribeEnd": "Image #{no} described\n\n**Final Description:**\n{summary}\n\n**Thinking Process:**\n{rawSummary}",
			"opDescribeFailed": "Image #{no} description failed: {message}",
			"opQueryAsked": "Asked about image(s) {nos}: {question}",
			"opQueryAnswered": "Answer: {answer}",
			"opQueryFailed": "Query failed: {message}",
			"opWarning": "Warning: {message}",
			"opToolInvoked": "Tool {tool} invoked for image(s) {nos}\n{detail}",
			"opMainRequest": "Main request imageCount={count} replacedCount={replaced}\n\n{preview}",
			"opLabelToggle": "Toggle",
			"opLabelImageAdded": "Image Added",
			"opLabelDescribeStart": "Describe Start",
			"opLabelDescribeEnd": "Describe End",
			"opLabelDescribeFailed": "Describe Failed",
			"opLabelQueryAsked": "Query Asked",
			"opLabelQueryAnswered": "Query Answered",
			"opLabelQueryFailed": "Query Failed",
			"opLabelWarning": "Warning",
			"opLabelToolInvoked": "Tool Invoked",
			"opLabelMainRequest": "Main Request"
		};
		//#endregion
		//#region \0dsh-css:/home/sy/deepseek-harness/packages/visual-aid/client-ui-visual-aid/src/client/VisualAidSection.module.css.mjs
		const css = ".j72auq_section{width:100%;color:var(--dsw-alias-label-primary);flex-direction:column;gap:7px;display:flex}.j72auq_title{color:var(--dsw-alias-label-primary);margin:0;font-size:18px;font-weight:600}.j72auq_intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}.j72auq_form{flex-direction:column;display:flex}.j72auq_row{border-bottom:1px solid var(--dsw-alias-border-l2);align-items:center;gap:7px;padding:14px 0;display:flex}.j72auq_row:last-child{border-bottom:none}.j72auq_rowText{min-width:0;color:var(--dsw-alias-label-primary);flex:1;padding-right:43px;font-size:14px;line-height:22px}.j72auq_control{box-sizing:border-box;background:var(--dsw-alias-bg-module-platform);width:240px;max-width:60%;height:32px;font:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;border:none;border-radius:16px;padding:0 13px;font-size:14px;line-height:22px}.j72auq_control:focus{box-shadow:0 0 0 2px var(--dsw-alias-border-l3);outline:none}select.j72auq_control{appearance:none;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2381858C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\");background-position:right 12px center;background-repeat:no-repeat;background-size:12px 12px;padding-right:32px}.j72auq_checkbox{width:18px;height:18px;accent-color:var(--dsw-alias-state-business-primary);cursor:pointer;flex:none}.j72auq_error{color:var(--dsw-alias-state-error-primary);margin:0;font-size:12px;line-height:18px}.j72auq_saved{color:var(--dsw-alias-state-success-primary);margin:0;font-size:12px;line-height:18px}.j72auq_actions{padding:11px 0 4px;display:flex}.j72auq_primaryButton{box-sizing:border-box;background:var(--dsw-alias-button-primary-fill);height:36px;color:var(--dsw-alias-label-primary-foreground);font:inherit;cursor:pointer;border:none;border-radius:18px;justify-content:center;align-items:center;padding:0 18px;font-size:14px;line-height:22px;display:inline-flex}.j72auq_primaryButton:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}.j72auq_primaryButton:disabled{opacity:.4;cursor:default}.j72auq_primaryButton:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3);outline:none}.j72auq_usage{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:12px;margin-top:8px;padding:14px 16px}.j72auq_usageTitle{color:var(--dsw-alias-label-primary);margin:0 0 8px;font-size:13px;font-weight:600;line-height:20px}.j72auq_usageTitle:not(:first-child){margin-top:14px}.j72auq_usageList{flex-direction:column;gap:6px;margin:0;padding-left:18px;display:flex}.j72auq_usageItem{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}.j72auq_vaViewRoot{box-sizing:border-box;width:100%;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);flex-direction:column;display:flex;overflow:hidden}.j72auq_vaViewToolbar{z-index:4;box-sizing:border-box;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);flex:none;align-items:center;gap:8px;width:100%;height:32px;padding:0 10px;display:flex;position:sticky;top:0}.j72auq_vaViewStats{min-width:0;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:12px;line-height:18px;overflow:hidden}.j72auq_vaViewActions{flex:none;align-items:center;gap:4px;display:flex}.j72auq_vaViewButton{border:1px solid var(--dsw-alias-border-l2);height:22px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border-radius:4px;align-items:center;padding:0 8px;font-size:12px;line-height:18px;display:inline-flex}.j72auq_vaViewButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.j72auq_vaViewButton:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary);outline-offset:1px}.j72auq_vaViewLedger{min-height:0;padding-bottom:calc(var(--dsh-composer-height,152px) + 16px);flex:1;overflow:auto}.j72auq_vaViewTable{width:100%}.j72auq_vaViewTurn{flex-direction:column;display:flex}.j72auq_vaViewRow{border-bottom:1px solid var(--dsw-alias-border-l1);grid-template-columns:88px 132px minmax(0,1fr);min-height:32px;display:grid}.j72auq_vaViewRow:last-child{border-bottom:none}.j72auq_vaViewTurnCell{box-sizing:border-box;border-right:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);min-width:0;color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;align-items:center;padding:6px 8px;font-size:12px;line-height:18px;display:flex;overflow:hidden}.j72auq_vaViewTurnCell:empty{background:0 0}.j72auq_vaViewTagCell{box-sizing:border-box;align-items:center;min-width:0;padding:6px 8px;display:flex}.j72auq_vaViewTag{white-space:nowrap;height:20px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border-radius:4px;flex:none;align-items:center;padding:0 7px;font-size:11px;font-weight:600;line-height:16px;display:inline-flex}.j72auq_vaViewTag[data-kind=describe]{color:var(--dsw-alias-state-warn-label);background:color-mix(in srgb, var(--dsw-alias-state-warn-label) 16%, transparent)}.j72auq_vaViewTag[data-kind=query]{color:var(--dsw-alias-state-business-primary);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 16%, transparent)}.j72auq_vaViewTag[data-kind=main]{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}.j72auq_vaViewTag[data-kind=image]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 16%, transparent)}.j72auq_vaViewTag[data-kind=warning]{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 16%, transparent)}.j72auq_vaViewContentCell{box-sizing:border-box;min-width:0;padding:6px 8px}.j72auq_vaViewMeta{color:var(--dsw-alias-label-caption);font-size:11px;line-height:16px}.j72auq_vaViewContent{color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-mono,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);white-space:pre-wrap;word-break:break-word;margin:2px 0 0;font-size:12px;line-height:18px}.j72auq_vaViewCollapsible{min-width:0}.j72auq_vaViewCollapsibleClickable{cursor:pointer;border-radius:4px}.j72auq_vaViewCollapsibleClickable:hover{background:var(--dsw-alias-interactive-bg-hover)}.j72auq_vaViewCollapsibleClickable:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary);outline-offset:1px}.j72auq_vaViewContentCollapsed{-webkit-line-clamp:3;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.j72auq_vaViewContentExpanded{display:block}.j72auq_vaViewHint{color:var(--dsw-alias-state-business-primary);pointer-events:none;user-select:none;margin-top:2px;font-size:11px;line-height:16px;display:block}.j72auq_vaViewEmpty{color:var(--dsw-alias-label-tertiary);text-align:center;padding:24px 16px;font-size:13px;line-height:20px}.j72auq_inputButton{background:var(--dsw-specific-selector);height:28px;color:var(--dsw-alias-label-primary);cursor:pointer;white-space:nowrap;border:none;border-radius:999px;flex:none;justify-content:center;align-items:center;padding:0 12px;font-size:12px;line-height:1;display:inline-flex}.j72auq_inputButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.j72auq_inputButton:disabled{opacity:.5;cursor:default}.j72auq_inputButtonActive{background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-on-color,#fff)}.j72auq_inputButtonActive:hover:not(:disabled){background:var(--dsw-alias-state-business-primary-hover,var(--dsw-alias-state-business-primary))}.j72auq_panel{z-index:100;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,#333);background:var(--dsw-specific-input-major,#1e1e1e);width:320px;max-height:400px;color:var(--dsw-alias-label-primary,inherit);box-shadow:var(--dsw-shadow-lv2,0 4px 12px #0006);border-radius:12px;padding:12px;font-size:13px;line-height:20px;position:fixed;bottom:16px;right:16px;overflow:auto}.j72auq_panelRow{white-space:pre-wrap}.j72auq_panelWarn{color:var(--dsw-alias-state-error-primary,#ff7875)}.j72auq_dropdownRoot{min-width:0;position:relative}.j72auq_dropdownMenu{z-index:30;border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-specific-menu);width:min(260px,100vw - 32px);max-height:min(360px,100vh - 96px);box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary);border-radius:12px;flex-direction:column;gap:4px;padding:8px;font-size:13px;line-height:20px;display:flex;position:absolute;bottom:calc(100% + 8px);right:0;overflow-y:auto}.j72auq_dropdownRow{border-radius:8px;justify-content:space-between;align-items:center;gap:8px;padding:6px 4px;display:flex}.j72auq_dropdownRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.j72auq_dropdownSelect{border:1px solid var(--dsw-alias-border-strong,#333);background:var(--dsw-alias-bg-field,transparent);max-width:160px;color:var(--dsw-alias-label-primary,inherit);border-radius:8px;padding:4px 6px;font-size:13px}.j72auq_vaRoot{min-width:0;position:relative}.j72auq_vaTrigger{min-width:0;max-width:220px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:24px;outline:none;align-items:center;gap:4px;padding:0 4px 0 8px;font-size:13px;font-weight:500;line-height:20px;display:flex}.j72auq_vaTrigger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.j72auq_vaTrigger:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}.j72auq_vaTriggerLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.j72auq_vaChevron{color:var(--dsw-alias-label-caption);flex:none;font-size:10px}.j72auq_vaMenu{z-index:30;border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-specific-menu);width:min(280px,100vw - 32px);max-height:min(420px,100vh - 96px);box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary);border-radius:12px;flex-direction:column;padding:4px;font-size:13px;line-height:20px;display:flex;position:absolute;bottom:calc(100% + 8px);right:0;overflow:hidden}.j72auq_vaCell{width:100%;min-height:38px;color:inherit;text-align:left;cursor:pointer;background:0 0;border:none;border-radius:10px;outline:none;align-items:center;gap:8px;padding:6px 8px;display:flex}.j72auq_vaCell:hover:not(:disabled),.j72auq_vaCell:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}.j72auq_vaCellValue{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;text-align:right;flex:1;font-size:12px;overflow:hidden}.j72auq_vaCellChevron{color:var(--dsw-alias-label-caption);flex:none}.j72auq_vaPane{flex-direction:column;min-height:0;display:flex}.j72auq_vaMenuHeader{border-bottom:1px solid var(--dsw-alias-divider,#333);align-items:center;gap:8px;margin-bottom:4px;padding:4px 4px 8px;font-weight:600;display:flex}.j72auq_vaBack{color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;padding:0;font-size:13px}.j72auq_vaScroll{min-height:0;overflow-y:auto}.j72auq_vaGroupTitle{z-index:1;background:var(--dsw-specific-menu);color:var(--dsw-alias-label-tertiary);padding:5px 8px 3px;font-size:12px;font-weight:500;line-height:18px;position:sticky;top:0}.j72auq_vaOption{width:100%;min-height:38px;color:inherit;text-align:left;cursor:pointer;background:0 0;border:none;border-radius:10px;outline:none;align-items:center;gap:8px;padding:6px 8px;display:flex}.j72auq_vaOption:hover:not(:disabled),.j72auq_vaOption:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}.j72auq_vaOptionCopy{flex-direction:column;flex:1;min-width:0;display:flex}.j72auq_vaOptionName{color:inherit;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:500;line-height:20px;overflow:hidden}.j72auq_vaOptionDesc{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:18px;overflow:hidden}.j72auq_vaCheck{color:var(--dsw-alias-label-primary);flex:0 0 18px;place-items:center;display:grid}.j72auq_vaCheckbox{appearance:none;border:1px solid var(--dsw-alias-border-strong,#555);background:var(--dsw-alias-bg-field,transparent);cursor:pointer;border-radius:4px;flex:0 0 16px;place-items:center;width:16px;height:16px;margin:0;display:inline-grid}.j72auq_vaCheckbox:checked{background:var(--dsw-alias-state-business-primary);border-color:var(--dsw-alias-state-business-primary)}.j72auq_vaCheckbox:checked:after{content:\"✓\";color:var(--dsw-alias-label-on-color,#fff);font-size:12px;line-height:1}.j72auq_vaContext{border-top:1px solid var(--dsw-alias-divider,#333);flex-direction:column;gap:6px;margin-top:4px;padding:10px 8px;display:flex}.j72auq_vaContextHeader{color:var(--dsw-alias-label-secondary);justify-content:space-between;align-items:center;gap:8px;font-size:12px;line-height:18px;display:flex}.j72auq_vaContextBar{background:var(--dsw-alias-interactive-bg-hover,#333);border-radius:999px;height:6px;overflow:hidden}.j72auq_vaContextBarFill{background:var(--dsw-alias-state-business-primary);border-radius:999px;height:100%}.j72auq_vaContextBreakdown{color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;gap:4px 12px;font-size:11px;line-height:16px;display:flex}.j72auq_vaContextModel{color:var(--dsw-alias-label-caption);text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:18px;overflow:hidden}.j72auq_vaDescribe{border-top:1px solid var(--dsw-alias-divider,#333);color:var(--dsw-alias-label-secondary);flex-direction:column;gap:4px;margin-top:4px;padding:10px 8px;font-size:12px;line-height:18px;display:flex}.j72auq_vaDescribeTitle{color:var(--dsw-alias-label-primary);font-weight:600}.j72auq_vaDescribeRow{color:var(--dsw-alias-label-tertiary)}";
		const tagId = "@sy008/dsh-client-ui-visual-aid/VisualAidSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@sy008/dsh-client-ui-visual-aid";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var VisualAidSection_module_css_default = {
			"vaMenu": "j72auq_vaMenu",
			"primaryButton": "j72auq_primaryButton",
			"vaOptionName": "j72auq_vaOptionName",
			"saved": "j72auq_saved",
			"actions": "j72auq_actions",
			"section": "j72auq_section",
			"panel": "j72auq_panel",
			"vaDescribeRow": "j72auq_vaDescribeRow",
			"dropdownSelect": "j72auq_dropdownSelect",
			"vaBack": "j72auq_vaBack",
			"vaContextBar": "j72auq_vaContextBar",
			"inputButtonActive": "j72auq_inputButtonActive",
			"title": "j72auq_title",
			"panelRow": "j72auq_panelRow",
			"rowText": "j72auq_rowText",
			"vaMenuHeader": "j72auq_vaMenuHeader",
			"vaContextBreakdown": "j72auq_vaContextBreakdown",
			"vaViewLedger": "j72auq_vaViewLedger",
			"vaViewTurnCell": "j72auq_vaViewTurnCell",
			"vaViewTagCell": "j72auq_vaViewTagCell",
			"vaViewEmpty": "j72auq_vaViewEmpty",
			"vaContext": "j72auq_vaContext",
			"vaCell": "j72auq_vaCell",
			"vaScroll": "j72auq_vaScroll",
			"vaViewTable": "j72auq_vaViewTable",
			"vaOption": "j72auq_vaOption",
			"vaViewToolbar": "j72auq_vaViewToolbar",
			"intro": "j72auq_intro",
			"vaViewHint": "j72auq_vaViewHint",
			"usageTitle": "j72auq_usageTitle",
			"inputButton": "j72auq_inputButton",
			"vaOptionDesc": "j72auq_vaOptionDesc",
			"vaDescribe": "j72auq_vaDescribe",
			"vaGroupTitle": "j72auq_vaGroupTitle",
			"vaViewStats": "j72auq_vaViewStats",
			"checkbox": "j72auq_checkbox",
			"vaViewContent": "j72auq_vaViewContent",
			"vaCheckbox": "j72auq_vaCheckbox",
			"row": "j72auq_row",
			"vaViewContentCell": "j72auq_vaViewContentCell",
			"usageItem": "j72auq_usageItem",
			"vaViewContentCollapsed": "j72auq_vaViewContentCollapsed",
			"vaCellValue": "j72auq_vaCellValue",
			"vaPane": "j72auq_vaPane",
			"vaContextModel": "j72auq_vaContextModel",
			"form": "j72auq_form",
			"vaViewActions": "j72auq_vaViewActions",
			"vaViewCollapsible": "j72auq_vaViewCollapsible",
			"vaTriggerLabel": "j72auq_vaTriggerLabel",
			"vaDescribeTitle": "j72auq_vaDescribeTitle",
			"vaViewRoot": "j72auq_vaViewRoot",
			"vaContextBarFill": "j72auq_vaContextBarFill",
			"error": "j72auq_error",
			"vaCellChevron": "j72auq_vaCellChevron",
			"usage": "j72auq_usage",
			"vaViewCollapsibleClickable": "j72auq_vaViewCollapsibleClickable",
			"vaViewContentExpanded": "j72auq_vaViewContentExpanded",
			"vaChevron": "j72auq_vaChevron",
			"vaViewTurn": "j72auq_vaViewTurn",
			"vaViewRow": "j72auq_vaViewRow",
			"usageList": "j72auq_usageList",
			"vaViewTag": "j72auq_vaViewTag",
			"vaRoot": "j72auq_vaRoot",
			"vaOptionCopy": "j72auq_vaOptionCopy",
			"dropdownRoot": "j72auq_dropdownRoot",
			"vaContextHeader": "j72auq_vaContextHeader",
			"control": "j72auq_control",
			"vaTrigger": "j72auq_vaTrigger",
			"panelWarn": "j72auq_panelWarn",
			"vaViewMeta": "j72auq_vaViewMeta",
			"vaViewButton": "j72auq_vaViewButton",
			"vaCheck": "j72auq_vaCheck",
			"dropdownMenu": "j72auq_dropdownMenu",
			"dropdownRow": "j72auq_dropdownRow"
		};
		//#endregion
		//#region lib/types/client/store.js
		const SETTINGS_ENDPOINT = "/api/visual-aid/settings";
		async function errorFrom(response, fallback) {
			let message = fallback;
			try {
				const data = await response.json();
				if (typeof data.error === "string" && data.error.length > 0) message = data.error;
			} catch {}
			return new Error(message);
		}
		async function loadSettings(_api) {
			const response = await fetch(SETTINGS_ENDPOINT);
			if (!response.ok) throw await errorFrom(response, `failed to load visual-aid settings (${response.status})`);
			const data = await response.json();
			return {
				...data.value ?? {},
				revision: data.revision ?? 0
			};
		}
		async function saveSettings(_api, revision, patch) {
			const response = await fetch(SETTINGS_ENDPOINT, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					revision,
					patch
				})
			});
			if (!response.ok) throw await errorFrom(response, `failed to save visual-aid settings (${response.status})`);
		}
		async function loadAllModels(api) {
			const response = await api.llm.models({});
			if (!response.result.ok) return [];
			return response.result.value.groups.flatMap((group) => group.models.map((model) => ({
				provider: group.id,
				providerName: group.name,
				model: model.id,
				modelName: model.name,
				...(() => {
					const maybe = model;
					return Array.isArray(maybe.inputModalities) ? { inputModalities: maybe.inputModalities } : {};
				})()
			})));
		}
		async function loadSessionData(sessionId) {
			const response = await fetch(`/api/visual-aid/session?sessionId=${encodeURIComponent(sessionId)}`);
			if (!response.ok) throw await errorFrom(response, `failed to load visual-aid session data (${response.status})`);
			return await response.json();
		}
		async function loadModelInfo(provider, model) {
			const response = await fetch(`/api/visual-aid/model-info?provider=${encodeURIComponent(provider)}&model=${encodeURIComponent(model)}`);
			if (!response.ok) return {};
			return await response.json();
		}
		//#endregion
		//#region lib/types/client/components.js
		const EMPTY_VISUAL_STATS = {
			answered: 0,
			steps: 0,
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			elapsedMs: 0,
			toolMs: 0
		};
		async function loadVisualData(_api, sessionId, t) {
			try {
				const data = await loadSessionData(String(sessionId));
				const rows = [];
				for (const q of data.qas) if (q.status === "answered") {
					if (typeof q.question === "string") rows.push({
						kind: "q",
						text: q.question
					});
					if (typeof q.answer === "string") rows.push({
						kind: "a",
						text: q.answer
					});
				}
				for (const img of data.imageRecords) if (img.status === "described" && typeof img.summary === "string") rows.push({
					kind: "desc",
					text: t("imageSummary", {
						no: String(img.imageNo),
						summary: img.summary
					})
				});
				else if (img.status === "failed" && typeof img.failure?.message === "string") rows.push({
					kind: "warn",
					text: t("imageDescribeFailed", {
						no: String(img.imageNo),
						message: img.failure.message
					})
				});
				for (const w of data.warnings) if (typeof w.message === "string") rows.push({
					kind: "warn",
					text: w.message
				});
				return {
					rows,
					stats: {
						answered: data.stats.visualAnswered,
						steps: data.stats.visualSteps,
						input: data.stats.visualInput,
						output: data.stats.visualOutput,
						cacheRead: data.stats.visualCacheRead,
						cacheWrite: data.stats.visualCacheWrite,
						elapsedMs: data.stats.visualElapsedMs,
						toolMs: data.stats.visualToolMs
					},
					operations: data.operations,
					data
				};
			} catch {
				return {
					rows: [],
					stats: EMPTY_VISUAL_STATS,
					operations: [],
					data: null
				};
			}
		}
		function formatStats(t, stats) {
			return t("statsSummary", {
				answered: String(stats.answered),
				steps: String(stats.steps),
				seconds: String(Math.round(stats.elapsedMs / 1e3)),
				toolMs: String(stats.toolMs),
				input: String(stats.input),
				output: String(stats.output),
				cacheRead: String(stats.cacheRead),
				cacheWrite: String(stats.cacheWrite)
			});
		}
		function VisualAidSection({ api, t }) {
			const [state, setState] = (0, react.useState)({
				loading: true,
				saving: false,
				error: null,
				saved: false,
				enabled: false,
				provider: "",
				model: "",
				revision: 0
			});
			const [models, setModels] = (0, react.useState)([]);
			const [draft, setDraft] = (0, react.useState)({});
			(0, react.useEffect)(() => {
				let cancelled = false;
				const applyValue = (value, all, full = false) => {
					const enabled = value.enabled === true;
					const provider = typeof value.provider === "string" ? value.provider : "";
					const model = typeof value.model === "string" ? value.model : "";
					const revision = typeof value.revision === "number" ? value.revision : 0;
					setState((prev) => ({
						...prev,
						loading: false,
						enabled,
						provider,
						model,
						revision,
						error: null
					}));
					if (all !== void 0) setModels(all);
					if (full) {
						setDraft({
							enabled,
							provider,
							model,
							maxTokens: typeof value.maxTokens === "number" ? String(value.maxTokens) : "4096",
							timeoutMs: typeof value.timeoutMs === "number" ? String(value.timeoutMs) : "120000",
							channelWindowRatio: typeof value.channelWindowRatio === "number" ? String(value.channelWindowRatio) : "0.85",
							describeImages: value.describeImages !== false,
							describeMaxTokens: typeof value.describeMaxTokens === "number" ? String(value.describeMaxTokens) : "512",
							masqueradeMultimodal: value.masqueradeMultimodal === true
						});
						if (provider.length > 0 && model.length > 0) loadModelInfo(provider, model).then((info) => {
							if (cancelled) return;
							const max = info.maxTokens;
							if (max !== void 0) setDraft((prev) => ({
								...prev,
								maxTokens: String(max),
								describeMaxTokens: String(Math.max(2048, Math.floor(max / 4)))
							}));
						});
						return;
					}
					setDraft((prev) => {
						if (prev.enabled === enabled && prev.provider === provider && prev.model === model) return prev;
						return {
							...prev,
							enabled,
							provider,
							model
						};
					});
				};
				const loadFull = async () => {
					try {
						const [value, all] = await Promise.all([loadSettings(api), loadAllModels(api)]);
						if (cancelled) return;
						applyValue(value, all, true);
					} catch (error) {
						if (cancelled) return;
						setState((prev) => ({
							...prev,
							loading: false,
							error: error instanceof Error ? error.message : String(error)
						}));
					}
				};
				const syncEnabled = async () => {
					try {
						const value = await loadSettings(api);
						if (cancelled) return;
						applyValue(value);
					} catch {}
				};
				loadFull();
				const timer = setInterval(() => {
					syncEnabled();
				}, 2e3);
				return () => {
					cancelled = true;
					clearInterval(timer);
				};
			}, [api]);
			const put = (key, value) => {
				setDraft((prev) => ({
					...prev,
					[key]: value
				}));
			};
			const save = async () => {
				setState((prev) => ({
					...prev,
					saving: true,
					error: null,
					saved: false
				}));
				try {
					const patch = {
						enabled: draft.enabled === true,
						describeImages: draft.describeImages === true,
						masqueradeMultimodal: draft.masqueradeMultimodal === true
					};
					if (typeof draft.provider === "string" && draft.provider.length > 0) patch.provider = draft.provider;
					if (typeof draft.model === "string" && draft.model.length > 0) patch.model = draft.model;
					for (const key of [
						"maxTokens",
						"timeoutMs",
						"channelWindowRatio",
						"describeMaxTokens"
					]) {
						const value = draft[key];
						if (typeof value === "string" && value.length > 0) patch[key] = Number(value);
					}
					await saveSettings(api, state.revision, patch);
					const value = await loadSettings(api);
					const enabled = value.enabled === true;
					const provider = typeof value.provider === "string" ? value.provider : "";
					const model = typeof value.model === "string" ? value.model : "";
					const revision = typeof value.revision === "number" ? value.revision : state.revision;
					setDraft((prev) => ({
						...prev,
						enabled,
						provider,
						model
					}));
					setState((prev) => ({
						...prev,
						saved: true,
						enabled,
						provider,
						model,
						revision
					}));
				} catch (error) {
					setState((prev) => ({
						...prev,
						saving: false,
						error: error instanceof Error ? error.message : String(error)
					}));
				} finally {
					setState((prev) => ({
						...prev,
						saving: false
					}));
				}
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: VisualAidSection_module_css_default.section,
				children: [
					(0, react_jsx_runtime.jsx)("h2", {
						className: VisualAidSection_module_css_default.title,
						children: t("nav")
					}),
					(0, react_jsx_runtime.jsx)("p", {
						className: VisualAidSection_module_css_default.intro,
						children: t("sectionIntro")
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: VisualAidSection_module_css_default.form,
						children: [
							(0, react_jsx_runtime.jsxs)("label", {
								className: VisualAidSection_module_css_default.row,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: VisualAidSection_module_css_default.rowText,
									children: t("enable")
								}), (0, react_jsx_runtime.jsx)("input", {
									className: VisualAidSection_module_css_default.checkbox,
									type: "checkbox",
									checked: draft.enabled === true,
									onChange: (event) => {
										put("enabled", event.target.checked);
									}
								})]
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								className: VisualAidSection_module_css_default.row,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: VisualAidSection_module_css_default.rowText,
									children: t("model")
								}), (0, react_jsx_runtime.jsxs)("select", {
									className: VisualAidSection_module_css_default.control,
									value: String(models.findIndex((option) => option.provider === draft.provider && option.model === draft.model)),
									onChange: (event) => {
										const option = models[Number(event.target.value)];
										if (option === void 0) {
											put("provider", "");
											put("model", "");
										} else {
											put("provider", option.provider);
											put("model", option.model);
											(async () => {
												const max = (await loadModelInfo(option.provider, option.model)).maxTokens ?? 4096;
												put("maxTokens", String(max));
												put("describeMaxTokens", String(Math.max(2048, Math.floor(max / 4))));
											})();
										}
									},
									children: [(0, react_jsx_runtime.jsx)("option", {
										value: "-1",
										children: t("modelEmpty")
									}), models.map((option, index) => (0, react_jsx_runtime.jsxs)("option", {
										value: String(index),
										children: [
											option.providerName,
											" · ",
											option.modelName
										]
									}, `${option.provider}/${option.model}`))]
								})]
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								className: VisualAidSection_module_css_default.row,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: VisualAidSection_module_css_default.rowText,
									children: t("maxTokens")
								}), (0, react_jsx_runtime.jsx)("input", {
									className: VisualAidSection_module_css_default.control,
									value: String(draft.maxTokens ?? ""),
									onChange: (event) => {
										put("maxTokens", event.target.value);
									}
								})]
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								className: VisualAidSection_module_css_default.row,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: VisualAidSection_module_css_default.rowText,
									children: t("timeoutMs")
								}), (0, react_jsx_runtime.jsx)("input", {
									className: VisualAidSection_module_css_default.control,
									value: String(draft.timeoutMs ?? ""),
									onChange: (event) => {
										put("timeoutMs", event.target.value);
									}
								})]
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								className: VisualAidSection_module_css_default.row,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: VisualAidSection_module_css_default.rowText,
									children: t("channelRatio")
								}), (0, react_jsx_runtime.jsx)("input", {
									className: VisualAidSection_module_css_default.control,
									value: String(draft.channelWindowRatio ?? ""),
									onChange: (event) => {
										put("channelWindowRatio", event.target.value);
									}
								})]
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								className: VisualAidSection_module_css_default.row,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: VisualAidSection_module_css_default.rowText,
									children: t("describe")
								}), (0, react_jsx_runtime.jsx)("input", {
									className: VisualAidSection_module_css_default.checkbox,
									type: "checkbox",
									checked: draft.describeImages === true,
									onChange: (event) => {
										put("describeImages", event.target.checked);
									}
								})]
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								className: VisualAidSection_module_css_default.row,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: VisualAidSection_module_css_default.rowText,
									children: t("describeMaxTokens")
								}), (0, react_jsx_runtime.jsx)("input", {
									className: VisualAidSection_module_css_default.control,
									value: String(draft.describeMaxTokens ?? ""),
									onChange: (event) => {
										put("describeMaxTokens", event.target.value);
									}
								})]
							}),
							(0, react_jsx_runtime.jsxs)("label", {
								className: VisualAidSection_module_css_default.row,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: VisualAidSection_module_css_default.rowText,
									children: t("masquerade")
								}), (0, react_jsx_runtime.jsx)("input", {
									className: VisualAidSection_module_css_default.checkbox,
									type: "checkbox",
									checked: draft.masqueradeMultimodal === true,
									onChange: (event) => {
										put("masqueradeMultimodal", event.target.checked);
									}
								})]
							})
						]
					}),
					state.error !== null ? (0, react_jsx_runtime.jsx)("div", {
						className: VisualAidSection_module_css_default.error,
						children: state.error
					}) : null,
					state.saved ? (0, react_jsx_runtime.jsx)("div", {
						className: VisualAidSection_module_css_default.saved,
						children: t("saved")
					}) : null,
					(0, react_jsx_runtime.jsx)("div", {
						className: VisualAidSection_module_css_default.actions,
						children: (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: VisualAidSection_module_css_default.primaryButton,
							disabled: state.loading || state.saving,
							onClick: () => {
								save();
							},
							children: state.saving ? t("saving") : t("save")
						})
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: VisualAidSection_module_css_default.usage,
						children: [
							(0, react_jsx_runtime.jsx)("h3", {
								className: VisualAidSection_module_css_default.usageTitle,
								children: t("usageTitle")
							}),
							(0, react_jsx_runtime.jsxs)("ul", {
								className: VisualAidSection_module_css_default.usageList,
								children: [
									(0, react_jsx_runtime.jsx)("li", {
										className: VisualAidSection_module_css_default.usageItem,
										children: t("usageStep1")
									}),
									(0, react_jsx_runtime.jsx)("li", {
										className: VisualAidSection_module_css_default.usageItem,
										children: t("usageStep2")
									}),
									(0, react_jsx_runtime.jsx)("li", {
										className: VisualAidSection_module_css_default.usageItem,
										children: t("usageStep3")
									}),
									(0, react_jsx_runtime.jsx)("li", {
										className: VisualAidSection_module_css_default.usageItem,
										children: t("usageStep4")
									}),
									(0, react_jsx_runtime.jsx)("li", {
										className: VisualAidSection_module_css_default.usageItem,
										children: t("usageStep5")
									}),
									(0, react_jsx_runtime.jsx)("li", {
										className: VisualAidSection_module_css_default.usageItem,
										children: t("usageStep6")
									})
								]
							}),
							(0, react_jsx_runtime.jsx)("h3", {
								className: VisualAidSection_module_css_default.usageTitle,
								children: t("noticeTitle")
							}),
							(0, react_jsx_runtime.jsxs)("ul", {
								className: VisualAidSection_module_css_default.usageList,
								children: [
									(0, react_jsx_runtime.jsx)("li", {
										className: VisualAidSection_module_css_default.usageItem,
										children: t("notice1")
									}),
									(0, react_jsx_runtime.jsx)("li", {
										className: VisualAidSection_module_css_default.usageItem,
										children: t("notice2")
									}),
									(0, react_jsx_runtime.jsx)("li", {
										className: VisualAidSection_module_css_default.usageItem,
										children: t("notice3")
									}),
									(0, react_jsx_runtime.jsx)("li", {
										className: VisualAidSection_module_css_default.usageItem,
										children: t("notice4")
									}),
									(0, react_jsx_runtime.jsx)("li", {
										className: VisualAidSection_module_css_default.usageItem,
										children: t("notice5")
									}),
									(0, react_jsx_runtime.jsx)("li", {
										className: VisualAidSection_module_css_default.usageItem,
										children: t("notice6")
									})
								]
							})
						]
					})
				]
			});
		}
		function VisualAidToggle({ sessionId, api, t }) {
			const [open, setOpen] = (0, react.useState)(false);
			const [pane, setPane] = (0, react.useState)("root");
			const [busy, setBusy] = (0, react.useState)(false);
			const [settings, setSettings] = (0, react.useState)({
				enabled: false,
				provider: "",
				model: "",
				revision: 0
			});
			const [models, setModels] = (0, react.useState)([]);
			const [modelInfo, setModelInfo] = (0, react.useState)(null);
			const [sessionData, setSessionData] = (0, react.useState)(null);
			const [status, setStatus] = (0, react.useState)("idle");
			const rootRef = (0, react.useRef)(null);
			const triggerRef = (0, react.useRef)(null);
			const [menuPos, setMenuPos] = (0, react.useState)(null);
			const refresh = async () => {
				try {
					const [value, all] = await Promise.all([loadSettings(api), loadAllModels(api)]);
					const enabled = value.enabled === true;
					const provider = typeof value.provider === "string" ? value.provider : "";
					const model = typeof value.model === "string" ? value.model : "";
					const reasoningEffort = typeof value.reasoningEffort === "string" ? value.reasoningEffort : void 0;
					setSettings((prev) => ({
						...prev,
						enabled,
						provider,
						model,
						...reasoningEffort === void 0 ? {} : { reasoningEffort },
						revision: value.revision ?? 0
					}));
					setModels(all);
					if (provider.length > 0 && model.length > 0) setModelInfo(await loadModelInfo(provider, model));
					else setModelInfo(null);
					try {
						const data = await loadSessionData(String(sessionId));
						setSessionData(data);
						const ops = data.operations ?? [];
						let lastDescribeStart = 0;
						let lastDescribeEnd = 0;
						let lastQueryAsked = 0;
						let lastQueryAnswered = 0;
						for (const op of ops) if (op.type === "describe-start") lastDescribeStart = op.time;
						else if (op.type === "describe-end") lastDescribeEnd = op.time;
						else if (op.type === "query-asked") lastQueryAsked = op.time;
						else if (op.type === "query-answered") lastQueryAnswered = op.time;
						let nextStatus = "idle";
						if (lastDescribeStart > lastDescribeEnd) nextStatus = "describing";
						else if (lastQueryAsked > lastQueryAnswered) nextStatus = "querying";
						setStatus(nextStatus);
					} catch {
						setSessionData(null);
						setStatus("idle");
					}
				} catch {}
			};
			(0, react.useEffect)(() => {
				refresh();
			}, [api, sessionId]);
			(0, react.useEffect)(() => {
				if (!open) return;
				refresh();
				const closeOutside = (event) => {
					if (!rootRef.current?.contains(event.target)) setOpen(false);
				};
				document.addEventListener("mousedown", closeOutside);
				return () => {
					document.removeEventListener("mousedown", closeOutside);
				};
			}, [
				open,
				api,
				sessionId
			]);
			(0, react.useEffect)(() => {
				const timer = setInterval(() => {
					refresh();
				}, 3e3);
				return () => {
					clearInterval(timer);
				};
			}, [api, sessionId]);
			const save = async (patch) => {
				if (busy) return;
				setBusy(true);
				try {
					await saveSettings(api, settings.revision, patch);
					await refresh();
				} finally {
					setBusy(false);
				}
			};
			const visionModels = models.filter((option) => option.inputModalities === void 0 || option.inputModalities.includes("image"));
			const currentModel = settings.enabled ? visionModels.find((option) => option.provider === settings.provider && option.model === settings.model) : void 0;
			const currentModelLabel = !settings.enabled ? t("statusOff") : currentModel === void 0 ? settings.model.length > 0 ? settings.model : t("modelEmpty") : `${currentModel.providerName} · ${currentModel.modelName}`;
			const currentEffortLabel = modelInfo?.reasoning?.efforts.find((effort) => effort.id === settings.reasoningEffort)?.name ?? t("defaultEffort");
			const triggerLabel = status === "describing" ? t("statusDescribing") : status === "querying" ? t("statusQuerying") : settings.enabled ? settings.model.length > 0 ? `${currentModelLabel} · ${t("visionPanel")}` : `${t("headerOn")} · ${t("visionPanel")}` : t("statusOff");
			const lastAnsweredQa = (sessionData?.qas ?? []).filter((qa) => qa.status === "answered").at(-1);
			const computedContext = (lastAnsweredQa?.usage?.inputTokens ?? 0) + (lastAnsweredQa?.usage?.cacheReadTokens ?? 0);
			const contextUsed = Math.max(sessionData?.currentContextTokens ?? 0, computedContext);
			const contextTotal = modelInfo?.contextWindow ?? 0;
			const contextPercent = contextTotal > 0 ? Math.min(100, contextUsed / contextTotal * 100) : 0;
			const recentApiInput = contextUsed;
			const lastDescribe = (sessionData?.imageRecords ?? []).at(-1);
			const lastQuery = (sessionData?.qas ?? []).filter((qa) => qa.status === "answered").at(-1);
			const describeLatestInputValue = sessionData?.currentDescribeInput ?? (lastDescribe?.usage?.inputTokens ?? 0) + (lastDescribe?.usage?.cacheReadTokens ?? 0);
			const describeLatestOutputValue = sessionData?.currentDescribeOutput ?? lastDescribe?.usage?.outputTokens ?? 0;
			const describeLatestElapsedValue = sessionData?.currentDescribeElapsedMs ?? lastDescribe?.elapsedMs ?? 0;
			const queryLatestInputValue = sessionData?.currentQueryInput ?? (lastQuery?.usage?.inputTokens ?? 0) + (lastQuery?.usage?.cacheReadTokens ?? 0);
			const queryLatestOutputValue = sessionData?.currentQueryOutput ?? lastQuery?.usage?.outputTokens ?? 0;
			const queryLatestElapsedValue = sessionData?.currentQueryElapsedMs ?? lastQuery?.elapsedMs ?? 0;
			const describeLatestInput = describeLatestInputValue.toLocaleString();
			const describeLatestOutput = describeLatestOutputValue.toLocaleString();
			const describeLatestSeconds = Math.round(describeLatestElapsedValue / 1e3);
			const queryLatestInput = queryLatestInputValue.toLocaleString();
			const queryLatestOutput = queryLatestOutputValue.toLocaleString();
			const queryLatestSeconds = Math.round(queryLatestElapsedValue / 1e3);
			const describeInputTotal = (sessionData?.imageRecords ?? []).reduce((sum, record) => sum + (record.usage?.inputTokens ?? 0) + (record.usage?.cacheReadTokens ?? 0), 0);
			const describeOutputTotal = (sessionData?.imageRecords ?? []).reduce((sum, record) => sum + (record.usage?.outputTokens ?? 0), 0);
			const describeElapsedTotal = (sessionData?.imageRecords ?? []).reduce((sum, record) => sum + (record.elapsedMs ?? 0), 0);
			const queryInputTotal = (sessionData?.qas ?? []).filter((qa) => qa.status === "answered").reduce((sum, qa) => sum + (qa.usage?.inputTokens ?? 0) + (qa.usage?.cacheReadTokens ?? 0), 0);
			const queryOutputTotal = (sessionData?.qas ?? []).filter((qa) => qa.status === "answered").reduce((sum, qa) => sum + (qa.usage?.outputTokens ?? 0), 0);
			const queryElapsedTotal = (sessionData?.qas ?? []).filter((qa) => qa.status === "answered").reduce((sum, qa) => sum + (qa.elapsedMs ?? 0), 0);
			const describeInputText = describeInputTotal.toLocaleString();
			const describeOutputText = describeOutputTotal.toLocaleString();
			const describeSeconds = Math.round(describeElapsedTotal / 1e3);
			const queryInputText = queryInputTotal.toLocaleString();
			const queryOutputText = queryOutputTotal.toLocaleString();
			const querySeconds = Math.round(queryElapsedTotal / 1e3);
			return (0, react_jsx_runtime.jsxs)("div", {
				ref: rootRef,
				className: VisualAidSection_module_css_default.vaRoot,
				children: [(0, react_jsx_runtime.jsxs)("button", {
					ref: triggerRef,
					type: "button",
					className: VisualAidSection_module_css_default.vaTrigger,
					"aria-haspopup": "menu",
					"aria-expanded": open,
					onClick: () => {
						if (open) {
							setOpen(false);
							setPane("root");
							setMenuPos(null);
						} else {
							const rect = triggerRef.current?.getBoundingClientRect();
							if (rect !== void 0) setMenuPos({
								left: Math.max(8, Math.min(rect.left, window.innerWidth - 280 - 8)),
								bottom: window.innerHeight - rect.top + 8
							});
							setPane("root");
							setOpen(true);
						}
					},
					children: [(0, react_jsx_runtime.jsx)("span", {
						className: VisualAidSection_module_css_default.vaTriggerLabel,
						children: triggerLabel
					}), (0, react_jsx_runtime.jsx)("span", {
						className: VisualAidSection_module_css_default.vaChevron,
						children: open ? "▲" : "▼"
					})]
				}), open && (0, react_jsx_runtime.jsxs)("div", {
					className: VisualAidSection_module_css_default.vaMenu,
					role: "menu",
					style: menuPos === null ? void 0 : {
						position: "fixed",
						left: menuPos.left,
						bottom: menuPos.bottom,
						right: "auto"
					},
					children: [
						pane === "root" && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							(0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: VisualAidSection_module_css_default.vaCell,
								onClick: () => {
									setPane("model");
								},
								children: [
									(0, react_jsx_runtime.jsx)("span", { children: t("model") }),
									(0, react_jsx_runtime.jsx)("span", {
										className: VisualAidSection_module_css_default.vaCellValue,
										children: currentModelLabel
									}),
									(0, react_jsx_runtime.jsx)("span", {
										className: VisualAidSection_module_css_default.vaCellChevron,
										children: "›"
									})
								]
							}),
							modelInfo?.reasoning !== void 0 && (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: VisualAidSection_module_css_default.vaCell,
								onClick: () => {
									setPane("effort");
								},
								children: [
									(0, react_jsx_runtime.jsx)("span", { children: t("reasoningLevel") }),
									(0, react_jsx_runtime.jsx)("span", {
										className: VisualAidSection_module_css_default.vaCellValue,
										children: currentEffortLabel
									}),
									(0, react_jsx_runtime.jsx)("span", {
										className: VisualAidSection_module_css_default.vaCellChevron,
										children: "›"
									})
								]
							}),
							contextTotal > 0 && (0, react_jsx_runtime.jsxs)("div", {
								className: VisualAidSection_module_css_default.vaContext,
								children: [
									(0, react_jsx_runtime.jsxs)("div", {
										className: VisualAidSection_module_css_default.vaContextHeader,
										children: [(0, react_jsx_runtime.jsx)("span", { children: t("contextUsed", { percent: contextPercent.toFixed(1) }) }), (0, react_jsx_runtime.jsxs)("span", { children: [
											"~",
											contextUsed.toLocaleString(),
											" / ",
											contextTotal.toLocaleString()
										] })]
									}),
									(0, react_jsx_runtime.jsx)("div", {
										className: VisualAidSection_module_css_default.vaContextBar,
										children: (0, react_jsx_runtime.jsx)("div", {
											className: VisualAidSection_module_css_default.vaContextBarFill,
											style: { width: `${contextPercent}%` }
										})
									}),
									(0, react_jsx_runtime.jsx)("div", {
										className: VisualAidSection_module_css_default.vaContextBreakdown,
										children: (0, react_jsx_runtime.jsx)("span", { children: t("officialContext", { value: recentApiInput.toLocaleString() }) })
									}),
									(0, react_jsx_runtime.jsx)("div", {
										className: VisualAidSection_module_css_default.vaContextModel,
										children: currentModelLabel
									})
								]
							}),
							sessionData !== null && (0, react_jsx_runtime.jsxs)("div", {
								className: VisualAidSection_module_css_default.vaDescribe,
								children: [
									(0, react_jsx_runtime.jsx)("div", {
										className: VisualAidSection_module_css_default.vaDescribeTitle,
										children: t("describeTitle")
									}),
									(0, react_jsx_runtime.jsx)("div", {
										className: VisualAidSection_module_css_default.vaDescribeRow,
										children: t("describeProcessed", { count: sessionData.stats.describeSteps ?? 0 })
									}),
									(0, react_jsx_runtime.jsx)("div", {
										className: VisualAidSection_module_css_default.vaDescribeRow,
										children: t("cumulativeStats", {
											input: describeInputText,
											output: describeOutputText,
											seconds: describeSeconds
										})
									}),
									(0, react_jsx_runtime.jsx)("div", {
										className: VisualAidSection_module_css_default.vaDescribeRow,
										children: t("latestStats", {
											input: describeLatestInput,
											output: describeLatestOutput,
											seconds: describeLatestSeconds
										})
									})
								]
							}),
							sessionData !== null && (0, react_jsx_runtime.jsxs)("div", {
								className: VisualAidSection_module_css_default.vaDescribe,
								children: [
									(0, react_jsx_runtime.jsx)("div", {
										className: VisualAidSection_module_css_default.vaDescribeTitle,
										children: t("qaTitle")
									}),
									(0, react_jsx_runtime.jsx)("div", {
										className: VisualAidSection_module_css_default.vaDescribeRow,
										children: t("qaCount", { count: sessionData.stats.querySteps ?? 0 })
									}),
									(0, react_jsx_runtime.jsx)("div", {
										className: VisualAidSection_module_css_default.vaDescribeRow,
										children: t("cumulativeStats", {
											input: queryInputText,
											output: queryOutputText,
											seconds: querySeconds
										})
									}),
									(0, react_jsx_runtime.jsx)("div", {
										className: VisualAidSection_module_css_default.vaDescribeRow,
										children: t("latestStats", {
											input: queryLatestInput,
											output: queryLatestOutput,
											seconds: queryLatestSeconds
										})
									})
								]
							})
						] }),
						pane === "model" && (0, react_jsx_runtime.jsxs)("div", {
							className: VisualAidSection_module_css_default.vaPane,
							children: [(0, react_jsx_runtime.jsxs)("div", {
								className: VisualAidSection_module_css_default.vaMenuHeader,
								children: [(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: VisualAidSection_module_css_default.vaBack,
									onClick: () => {
										setPane("root");
									},
									children: t("back")
								}), (0, react_jsx_runtime.jsx)("span", { children: t("model") })]
							}), (0, react_jsx_runtime.jsxs)("div", {
								className: VisualAidSection_module_css_default.vaScroll,
								children: [(0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: VisualAidSection_module_css_default.vaOption,
									onClick: () => {
										save({ enabled: false });
									},
									children: [(0, react_jsx_runtime.jsx)("span", { children: t("close") }), !settings.enabled && (0, react_jsx_runtime.jsx)("span", {
										className: VisualAidSection_module_css_default.vaCheck,
										children: "✓"
									})]
								}), visionModels.map((option) => {
									const active = settings.enabled && option.provider === settings.provider && option.model === settings.model;
									return (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: VisualAidSection_module_css_default.vaOption,
										onClick: () => {
											save({
												enabled: true,
												provider: option.provider,
												model: option.model
											});
										},
										children: [(0, react_jsx_runtime.jsxs)("span", {
											className: VisualAidSection_module_css_default.vaOptionCopy,
											children: [(0, react_jsx_runtime.jsx)("span", {
												className: VisualAidSection_module_css_default.vaOptionName,
												children: option.modelName
											}), (0, react_jsx_runtime.jsx)("span", {
												className: VisualAidSection_module_css_default.vaOptionDesc,
												children: option.providerName
											})]
										}), active && (0, react_jsx_runtime.jsx)("span", {
											className: VisualAidSection_module_css_default.vaCheck,
											children: "✓"
										})]
									}, `${option.provider}/${option.model}`);
								})]
							})]
						}),
						pane === "effort" && modelInfo?.reasoning !== void 0 && (0, react_jsx_runtime.jsxs)("div", {
							className: VisualAidSection_module_css_default.vaPane,
							children: [(0, react_jsx_runtime.jsxs)("div", {
								className: VisualAidSection_module_css_default.vaMenuHeader,
								children: [(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: VisualAidSection_module_css_default.vaBack,
									onClick: () => {
										setPane("root");
									},
									children: t("back")
								}), (0, react_jsx_runtime.jsx)("span", { children: t("reasoningLevel") })]
							}), (0, react_jsx_runtime.jsxs)("div", {
								className: VisualAidSection_module_css_default.vaScroll,
								children: [(0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: VisualAidSection_module_css_default.vaOption,
									onClick: () => {
										save({ reasoningEffort: "" });
									},
									children: [(0, react_jsx_runtime.jsx)("span", { children: t("defaultEffort") }), (settings.reasoningEffort === void 0 || settings.reasoningEffort === "") && (0, react_jsx_runtime.jsx)("span", {
										className: VisualAidSection_module_css_default.vaCheck,
										children: "✓"
									})]
								}), modelInfo.reasoning.efforts.map((effort) => (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: VisualAidSection_module_css_default.vaOption,
									onClick: () => {
										save({ reasoningEffort: effort.id });
									},
									children: [(0, react_jsx_runtime.jsx)("span", { children: effort.name }), settings.reasoningEffort === effort.id && (0, react_jsx_runtime.jsx)("span", {
										className: VisualAidSection_module_css_default.vaCheck,
										children: "✓"
									})]
								}, effort.id))]
							})]
						})
					]
				})]
			});
		}
		const OPERATION_LABEL_KEYS = {
			toggle: "opLabelToggle",
			"image-added": "opLabelImageAdded",
			"describe-start": "opLabelDescribeStart",
			"describe-end": "opLabelDescribeEnd",
			"describe-failed": "opLabelDescribeFailed",
			"query-asked": "opLabelQueryAsked",
			"query-answered": "opLabelQueryAnswered",
			"query-failed": "opLabelQueryFailed",
			warning: "opLabelWarning",
			"tool-invoked": "opLabelToolInvoked",
			"main-request": "opLabelMainRequest"
		};
		function operationLabel(t, type) {
			const key = OPERATION_LABEL_KEYS[type];
			return key === void 0 ? type : t(key);
		}
		function operationText(t, op) {
			const d = op.data;
			switch (op.type) {
				case "toggle": return t(d.enabled ? "opToggleOn" : "opToggleOff");
				case "image-added": return t("opImageAdded", {
					no: String(d.imageNo ?? ""),
					name: String(d.name ?? "")
				});
				case "describe-start": return t("opDescribeStart", { no: String(d.imageNo ?? "") });
				case "describe-end": return t("opDescribeEnd", {
					no: String(d.imageNo ?? ""),
					summary: String(d.summary ?? ""),
					rawSummary: String(d.rawSummary ?? "")
				});
				case "describe-failed": return t("opDescribeFailed", {
					no: String(d.imageNo ?? ""),
					message: String(d.message ?? "")
				});
				case "query-asked": return t("opQueryAsked", {
					nos: Array.isArray(d.imageNos) ? d.imageNos.join(", ") : "",
					question: String(d.question ?? "")
				});
				case "query-answered": return t("opQueryAnswered", { answer: String(d.answer ?? "") });
				case "query-failed": return t("opQueryFailed", { message: String(d.message ?? "") });
				case "warning": return t("opWarning", { message: String(d.message ?? "") });
				case "tool-invoked": return t("opToolInvoked", {
					tool: String(d.tool ?? ""),
					nos: Array.isArray(d.imageNos) ? d.imageNos.join(", ") : "",
					detail: JSON.stringify(d, null, 2)
				});
				case "main-request": return t("opMainRequest", {
					count: String(d.imageCount ?? ""),
					replaced: String(d.replacedCount ?? ""),
					preview: String(d.textPreview ?? "")
				});
				default: return JSON.stringify(d, null, 2);
			}
		}
		function CollapsibleOperationContent({ text, t }) {
			const ref = (0, react.useRef)(null);
			const [overflow, setOverflow] = (0, react.useState)(false);
			const [expanded, setExpanded] = (0, react.useState)(false);
			(0, react.useLayoutEffect)(() => {
				const el = ref.current;
				if (el === null || expanded) return;
				setOverflow(el.scrollHeight > el.clientHeight + 1);
			}, [text, expanded]);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: overflow ? `${VisualAidSection_module_css_default.vaViewCollapsible} ${VisualAidSection_module_css_default.vaViewCollapsibleClickable}` : VisualAidSection_module_css_default.vaViewCollapsible,
				role: overflow ? "button" : void 0,
				tabIndex: overflow ? 0 : void 0,
				"aria-expanded": overflow ? expanded : void 0,
				title: overflow ? expanded ? t("collapse") : t("expand") : void 0,
				onClick: () => {
					if (overflow) setExpanded((value) => !value);
				},
				onKeyDown: (event) => {
					if (!overflow) return;
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						setExpanded((value) => !value);
					}
				},
				children: [(0, react_jsx_runtime.jsx)("pre", {
					ref,
					className: expanded ? `${VisualAidSection_module_css_default.vaViewContent} ${VisualAidSection_module_css_default.vaViewContentExpanded}` : `${VisualAidSection_module_css_default.vaViewContent} ${VisualAidSection_module_css_default.vaViewContentCollapsed}`,
					children: text
				}), overflow && (0, react_jsx_runtime.jsx)("span", {
					className: VisualAidSection_module_css_default.vaViewHint,
					children: expanded ? t("collapse") : t("expand")
				})]
			});
		}
		function visualOperationKind(type) {
			if (type.startsWith("describe")) return "describe";
			if (type.startsWith("query")) return "query";
			if (type === "main-request") return "main";
			if (type === "image-added") return "image";
			if (type === "warning") return "warning";
			return "toggle";
		}
		function VisualView({ sessionId, api, t }) {
			const [stats, setStats] = (0, react.useState)(EMPTY_VISUAL_STATS);
			const [operations, setOperations] = (0, react.useState)([]);
			const [data, setData] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				loadVisualData(api, sessionId, t).then(({ stats, operations, data }) => {
					setStats(stats);
					setOperations(operations);
					setData(data);
				});
			}, [api, sessionId]);
			const exportJson = () => {
				if (data === null) return;
				const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `visual-aid-${String(sessionId)}.json`;
				a.click();
				URL.revokeObjectURL(url);
			};
			const exportMarkdown = () => {
				if (data === null) return;
				const lines = [
					t("exportMarkdownTitle", { sessionId: String(sessionId) }),
					"",
					t("exportMarkdownOperations"),
					"",
					...operations.map((op) => `- **${new Date(op.time).toLocaleString()}** [${op.turn === void 0 ? t("turnUnknown") : t("turnLabel", { turn: op.turn })}] ${operationLabel(t, op.type)}: ${operationText(t, op)}`),
					"",
					t("exportMarkdownStats"),
					"",
					t("mdSteps", { value: String(stats.steps) }),
					t("mdAnswered", { value: String(stats.answered) }),
					t("mdInputTokens", { value: String(stats.input) }),
					t("mdOutputTokens", { value: String(stats.output) }),
					t("mdCacheRead", { value: String(stats.cacheRead) }),
					t("mdCacheWrite", { value: String(stats.cacheWrite) }),
					t("mdLlmTime", { value: String(stats.elapsedMs) })
				];
				const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `visual-aid-${String(sessionId)}.md`;
				a.click();
				URL.revokeObjectURL(url);
			};
			const groups = /* @__PURE__ */ new Map();
			for (const op of operations) {
				const key = op.turn ?? -1;
				const list = groups.get(key);
				if (list === void 0) groups.set(key, [op]);
				else list.push(op);
			}
			const turnKeys = [...groups.keys()].sort((a, b) => a - b);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: VisualAidSection_module_css_default.vaViewRoot,
				"data-conversation-composer-overlay": "",
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: VisualAidSection_module_css_default.vaViewToolbar,
					role: "toolbar",
					children: [(0, react_jsx_runtime.jsx)("span", {
						className: VisualAidSection_module_css_default.vaViewStats,
						children: formatStats(t, stats)
					}), (0, react_jsx_runtime.jsxs)("div", {
						className: VisualAidSection_module_css_default.vaViewActions,
						children: [(0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: VisualAidSection_module_css_default.vaViewButton,
							onClick: exportJson,
							children: t("exportJson")
						}), (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: VisualAidSection_module_css_default.vaViewButton,
							onClick: exportMarkdown,
							children: t("exportMarkdown")
						})]
					})]
				}), (0, react_jsx_runtime.jsx)("div", {
					className: VisualAidSection_module_css_default.vaViewLedger,
					children: operations.length === 0 ? (0, react_jsx_runtime.jsx)("div", {
						className: VisualAidSection_module_css_default.vaViewEmpty,
						children: t("visionEmpty")
					}) : (0, react_jsx_runtime.jsx)("div", {
						className: VisualAidSection_module_css_default.vaViewTable,
						children: turnKeys.map((turn) => {
							const ops = groups.get(turn) ?? [];
							const turnLabel = turn === -1 ? t("turnUnknown") : t("turnLabel", { turn });
							return (0, react_jsx_runtime.jsx)("div", {
								className: VisualAidSection_module_css_default.vaViewTurn,
								children: ops.map((op, index) => (0, react_jsx_runtime.jsxs)("div", {
									className: VisualAidSection_module_css_default.vaViewRow,
									"data-turn-start": index === 0 || void 0,
									children: [
										(0, react_jsx_runtime.jsx)("div", {
											className: VisualAidSection_module_css_default.vaViewTurnCell,
											children: index === 0 ? turnLabel : ""
										}),
										(0, react_jsx_runtime.jsx)("div", {
											className: VisualAidSection_module_css_default.vaViewTagCell,
											children: (0, react_jsx_runtime.jsx)("span", {
												className: VisualAidSection_module_css_default.vaViewTag,
												"data-kind": visualOperationKind(op.type),
												children: operationLabel(t, op.type)
											})
										}),
										(0, react_jsx_runtime.jsxs)("div", {
											className: VisualAidSection_module_css_default.vaViewContentCell,
											children: [(0, react_jsx_runtime.jsx)("div", {
												className: VisualAidSection_module_css_default.vaViewMeta,
												children: new Date(op.time).toLocaleString()
											}), (0, react_jsx_runtime.jsx)(CollapsibleOperationContent, {
												text: operationText(t, op),
												t
											})]
										})
									]
								}, index))
							}, turn);
						})
					})
				})]
			});
		}
		//#endregion
		//#region lib/types/client/index.js
		const inject = [
			"connection",
			"locale",
			"slots"
		];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-visual-aid: dictionaries");
			const api = ctx.get("connection").api;
			const originalPrompt = api.sessions.prompt.bind(api.sessions);
			api.sessions.prompt = (async (request) => {
				const payload = request;
				const content = payload.content;
				if (!content.some((part) => part.type === "image")) return originalPrompt(request);
				const images = content.filter((part) => part.type === "image" && typeof part.mediaType === "string" && typeof part.data === "string").map((part) => ({
					mediaType: part.mediaType,
					data: part.data,
					...part.name === void 0 ? {} : { name: part.name }
				}));
				const text = content.filter((part) => part.type === "text").map((part) => part.text ?? "").join("");
				const response = await fetch("/api/visual-aid/upload", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						sessionId: payload.sessionId,
						images,
						text
					})
				});
				if (!response.ok) return { result: {
					ok: false,
					error: {
						code: "attachment-error",
						message: (await response.json().catch(() => ({}))).error ?? "visual-aid upload failed",
						details: {}
					}
				} };
				return { result: {
					ok: true,
					value: { accepted: true }
				} };
			});
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "visual-aid",
				order: 25,
				label: () => ctx.locale.bind(NS)("nav"),
				locale: NS,
				inject: () => ({ api })
			}, VisualAidSection));
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "visual",
				order: 20,
				locale: NS,
				label: () => ctx.locale.bind(NS)("viewVisual"),
				inject: () => ({ api })
			}, VisualView));
			ctx.inject(["slots", "sessions"], (scope) => {
				scope.effect(() => {
					const toggle = scope.slots.register({
						name: "conversation.input.left",
						id: "visual-aid-toggle",
						order: 30,
						label: () => scope.locale.bind(NS)("headerOn"),
						locale: NS,
						inject: () => ({ api })
					}, VisualAidToggle);
					return () => {
						toggle();
					};
				}, "ui-visual-aid: input bar actions");
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map