import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import css from './VisualAidSection.module.css';
import { loadAllModels, loadModelInfo, loadSessionData, loadSettings, saveSettings } from "./store.js";
const EMPTY_VISUAL_STATS = {
    answered: 0,
    steps: 0,
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    elapsedMs: 0,
    toolMs: 0,
};
async function loadVisualData(_api, sessionId, t) {
    try {
        const data = await loadSessionData(String(sessionId));
        const rows = [];
        for (const q of data.qas) {
            if (q.status === 'answered') {
                if (typeof q.question === 'string')
                    rows.push({ kind: 'q', text: q.question });
                if (typeof q.answer === 'string')
                    rows.push({ kind: 'a', text: q.answer });
            }
        }
        for (const img of data.imageRecords) {
            if (img.status === 'described' && typeof img.summary === 'string') {
                rows.push({ kind: 'desc', text: t('imageSummary', { no: String(img.imageNo), summary: img.summary }) });
            }
            else if (img.status === 'failed' && typeof img.failure?.message === 'string') {
                rows.push({ kind: 'warn', text: t('imageDescribeFailed', { no: String(img.imageNo), message: img.failure.message }) });
            }
        }
        for (const w of data.warnings) {
            if (typeof w.message === 'string')
                rows.push({ kind: 'warn', text: w.message });
        }
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
                toolMs: data.stats.visualToolMs,
            },
            operations: data.operations,
            data,
        };
    }
    catch {
        return { rows: [], stats: EMPTY_VISUAL_STATS, operations: [], data: null };
    }
}
function formatStats(t, stats) {
    return t('statsSummary', {
        answered: String(stats.answered),
        steps: String(stats.steps),
        seconds: String(Math.round(stats.elapsedMs / 1000)),
        toolMs: String(stats.toolMs),
        input: String(stats.input),
        output: String(stats.output),
        cacheRead: String(stats.cacheRead),
        cacheWrite: String(stats.cacheWrite),
    });
}
export function VisualAidSection({ api, t }) {
    const [state, setState] = useState({ loading: true, saving: false, error: null, saved: false, enabled: false, provider: '', model: '', revision: 0 });
    const [models, setModels] = useState([]);
    const [draft, setDraft] = useState({});
    useEffect(() => {
        let cancelled = false;
        const applyValue = (value, all, full = false) => {
            const enabled = value.enabled === true;
            const provider = typeof value.provider === 'string' ? value.provider : '';
            const model = typeof value.model === 'string' ? value.model : '';
            const revision = typeof value.revision === 'number' ? value.revision : 0;
            setState(prev => ({ ...prev, loading: false, enabled, provider, model, revision, error: null }));
            if (all !== undefined)
                setModels(all);
            if (full) {
                setDraft({
                    enabled,
                    provider,
                    model,
                    maxTokens: typeof value.maxTokens === 'number' ? String(value.maxTokens) : '4096',
                    timeoutMs: typeof value.timeoutMs === 'number' ? String(value.timeoutMs) : '120000',
                    channelWindowRatio: typeof value.channelWindowRatio === 'number' ? String(value.channelWindowRatio) : '0.85',
                    describeImages: value.describeImages !== false,
                    describeMaxTokens: typeof value.describeMaxTokens === 'number' ? String(value.describeMaxTokens) : '512',
                    masqueradeMultimodal: value.masqueradeMultimodal === true,
                });
                if (provider.length > 0 && model.length > 0) {
                    void loadModelInfo(provider, model).then((info) => {
                        if (cancelled)
                            return;
                        const max = info.maxTokens;
                        if (max !== undefined) {
                            setDraft(prev => ({
                                ...prev,
                                maxTokens: String(max),
                                describeMaxTokens: String(Math.max(2048, Math.floor(max / 4))),
                            }));
                        }
                    });
                }
                return;
            }
            // Keep the settings checkbox/model in lockstep with the top-bar close/open
            // action without wiping unrelated in-progress form edits.
            setDraft(prev => {
                if (prev.enabled === enabled && prev.provider === provider && prev.model === model)
                    return prev;
                return { ...prev, enabled, provider, model };
            });
        };
        const loadFull = async () => {
            try {
                const [value, all] = await Promise.all([loadSettings(api), loadAllModels(api)]);
                if (cancelled)
                    return;
                applyValue(value, all, true);
            }
            catch (error) {
                if (cancelled)
                    return;
                setState(prev => ({ ...prev, loading: false, error: error instanceof Error ? error.message : String(error) }));
            }
        };
        const syncEnabled = async () => {
            try {
                const value = await loadSettings(api);
                if (cancelled)
                    return;
                applyValue(value);
            }
            catch {
                // Keep last good state on transient failures.
            }
        };
        void loadFull();
        const timer = setInterval(() => { void syncEnabled(); }, 2000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [api]);
    const put = (key, value) => { setDraft(prev => ({ ...prev, [key]: value })); };
    const save = async () => {
        setState(prev => ({ ...prev, saving: true, error: null, saved: false }));
        try {
            const patch = {
                enabled: draft.enabled === true,
                describeImages: draft.describeImages === true,
                masqueradeMultimodal: draft.masqueradeMultimodal === true,
            };
            if (typeof draft.provider === 'string' && draft.provider.length > 0)
                patch.provider = draft.provider;
            if (typeof draft.model === 'string' && draft.model.length > 0)
                patch.model = draft.model;
            for (const key of ['maxTokens', 'timeoutMs', 'channelWindowRatio', 'describeMaxTokens']) {
                const value = draft[key];
                if (typeof value === 'string' && value.length > 0)
                    patch[key] = Number(value);
            }
            await saveSettings(api, state.revision, patch);
            const value = await loadSettings(api);
            const enabled = value.enabled === true;
            const provider = typeof value.provider === 'string' ? value.provider : '';
            const model = typeof value.model === 'string' ? value.model : '';
            const revision = typeof value.revision === 'number' ? value.revision : state.revision;
            setDraft(prev => ({ ...prev, enabled, provider, model }));
            setState(prev => ({ ...prev, saved: true, enabled, provider, model, revision }));
        }
        catch (error) {
            setState(prev => ({ ...prev, saving: false, error: error instanceof Error ? error.message : String(error) }));
        }
        finally {
            setState(prev => ({ ...prev, saving: false }));
        }
    };
    return (_jsxs("div", { className: css.section, children: [_jsx("h2", { className: css.title, children: t('nav') }), _jsx("p", { className: css.intro, children: t('sectionIntro') }), _jsxs("div", { className: css.form, children: [_jsxs("label", { className: css.row, children: [_jsx("span", { className: css.rowText, children: t('enable') }), _jsx("input", { className: css.checkbox, type: "checkbox", checked: draft.enabled === true, onChange: (event) => { put('enabled', event.target.checked); } })] }), _jsxs("label", { className: css.row, children: [_jsx("span", { className: css.rowText, children: t('model') }), _jsxs("select", { className: css.control, value: String(models.findIndex(option => option.provider === draft.provider && option.model === draft.model)), onChange: (event) => {
                                    const index = Number(event.target.value);
                                    const option = models[index];
                                    if (option === undefined) {
                                        put('provider', '');
                                        put('model', '');
                                    }
                                    else {
                                        put('provider', option.provider);
                                        put('model', option.model);
                                        void (async () => {
                                            const info = await loadModelInfo(option.provider, option.model);
                                            const max = info.maxTokens ?? 4096;
                                            put('maxTokens', String(max));
                                            put('describeMaxTokens', String(Math.max(2048, Math.floor(max / 4))));
                                        })();
                                    }
                                }, children: [_jsx("option", { value: "-1", children: t('modelEmpty') }), models.map((option, index) => _jsxs("option", { value: String(index), children: [option.providerName, " \u00B7 ", option.modelName] }, `${option.provider}/${option.model}`))] })] }), _jsxs("label", { className: css.row, children: [_jsx("span", { className: css.rowText, children: t('maxTokens') }), _jsx("input", { className: css.control, value: String(draft.maxTokens ?? ''), onChange: (event) => { put('maxTokens', event.target.value); } })] }), _jsxs("label", { className: css.row, children: [_jsx("span", { className: css.rowText, children: t('timeoutMs') }), _jsx("input", { className: css.control, value: String(draft.timeoutMs ?? ''), onChange: (event) => { put('timeoutMs', event.target.value); } })] }), _jsxs("label", { className: css.row, children: [_jsx("span", { className: css.rowText, children: t('channelRatio') }), _jsx("input", { className: css.control, value: String(draft.channelWindowRatio ?? ''), onChange: (event) => { put('channelWindowRatio', event.target.value); } })] }), _jsxs("label", { className: css.row, children: [_jsx("span", { className: css.rowText, children: t('describe') }), _jsx("input", { className: css.checkbox, type: "checkbox", checked: draft.describeImages === true, onChange: (event) => { put('describeImages', event.target.checked); } })] }), _jsxs("label", { className: css.row, children: [_jsx("span", { className: css.rowText, children: t('describeMaxTokens') }), _jsx("input", { className: css.control, value: String(draft.describeMaxTokens ?? ''), onChange: (event) => { put('describeMaxTokens', event.target.value); } })] }), _jsxs("label", { className: css.row, children: [_jsx("span", { className: css.rowText, children: t('masquerade') }), _jsx("input", { className: css.checkbox, type: "checkbox", checked: draft.masqueradeMultimodal === true, onChange: (event) => { put('masqueradeMultimodal', event.target.checked); } })] })] }), state.error !== null ? _jsx("div", { className: css.error, children: state.error }) : null, state.saved ? _jsx("div", { className: css.saved, children: t('saved') }) : null, _jsx("div", { className: css.actions, children: _jsx("button", { type: "button", className: css.primaryButton, disabled: state.loading || state.saving, onClick: () => { void save(); }, children: state.saving ? t('saving') : t('save') }) }), _jsxs("div", { className: css.usage, children: [_jsx("h3", { className: css.usageTitle, children: t('usageTitle') }), _jsxs("ul", { className: css.usageList, children: [_jsx("li", { className: css.usageItem, children: t('usageStep1') }), _jsx("li", { className: css.usageItem, children: t('usageStep2') }), _jsx("li", { className: css.usageItem, children: t('usageStep3') }), _jsx("li", { className: css.usageItem, children: t('usageStep4') }), _jsx("li", { className: css.usageItem, children: t('usageStep5') }), _jsx("li", { className: css.usageItem, children: t('usageStep6') })] }), _jsx("h3", { className: css.usageTitle, children: t('noticeTitle') }), _jsxs("ul", { className: css.usageList, children: [_jsx("li", { className: css.usageItem, children: t('notice1') }), _jsx("li", { className: css.usageItem, children: t('notice2') }), _jsx("li", { className: css.usageItem, children: t('notice3') }), _jsx("li", { className: css.usageItem, children: t('notice4') }), _jsx("li", { className: css.usageItem, children: t('notice5') }), _jsx("li", { className: css.usageItem, children: t('notice6') })] })] })] }));
}
export function VisualAidToggle({ sessionId, api, t }) {
    const [open, setOpen] = useState(false);
    const [pane, setPane] = useState('root');
    const [busy, setBusy] = useState(false);
    const [settings, setSettings] = useState({ enabled: false, provider: '', model: '', revision: 0 });
    const [models, setModels] = useState([]);
    const [modelInfo, setModelInfo] = useState(null);
    const [sessionData, setSessionData] = useState(null);
    const [status, setStatus] = useState('idle');
    const rootRef = useRef(null);
    const triggerRef = useRef(null);
    const [menuPos, setMenuPos] = useState(null);
    const refresh = async () => {
        try {
            const [value, all] = await Promise.all([loadSettings(api), loadAllModels(api)]);
            const enabled = value.enabled === true;
            const provider = typeof value.provider === 'string' ? value.provider : '';
            const model = typeof value.model === 'string' ? value.model : '';
            const reasoningEffort = typeof value.reasoningEffort === 'string' ? value.reasoningEffort : undefined;
            setSettings(prev => ({
                ...prev,
                enabled,
                provider,
                model,
                ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
                revision: value.revision ?? 0,
            }));
            setModels(all);
            if (provider.length > 0 && model.length > 0) {
                setModelInfo(await loadModelInfo(provider, model));
            }
            else {
                setModelInfo(null);
            }
            try {
                const data = await loadSessionData(String(sessionId));
                setSessionData(data);
                const ops = data.operations ?? [];
                let lastDescribeStart = 0;
                let lastDescribeEnd = 0;
                let lastQueryAsked = 0;
                let lastQueryAnswered = 0;
                for (const op of ops) {
                    if (op.type === 'describe-start')
                        lastDescribeStart = op.time;
                    else if (op.type === 'describe-end')
                        lastDescribeEnd = op.time;
                    else if (op.type === 'query-asked')
                        lastQueryAsked = op.time;
                    else if (op.type === 'query-answered')
                        lastQueryAnswered = op.time;
                }
                let nextStatus = 'idle';
                if (lastDescribeStart > lastDescribeEnd)
                    nextStatus = 'describing';
                else if (lastQueryAsked > lastQueryAnswered)
                    nextStatus = 'querying';
                setStatus(nextStatus);
            }
            catch {
                setSessionData(null);
                setStatus('idle');
            }
        }
        catch {
            // Keep last good state on transient failures.
        }
    };
    useEffect(() => {
        void refresh();
    }, [api, sessionId]);
    useEffect(() => {
        if (!open)
            return;
        void refresh();
        const closeOutside = (event) => {
            if (!rootRef.current?.contains(event.target))
                setOpen(false);
        };
        document.addEventListener('mousedown', closeOutside);
        return () => { document.removeEventListener('mousedown', closeOutside); };
    }, [open, api, sessionId]);
    useEffect(() => {
        const timer = setInterval(() => { void refresh(); }, 3000);
        return () => { clearInterval(timer); };
    }, [api, sessionId]);
    const save = async (patch) => {
        if (busy)
            return;
        setBusy(true);
        try {
            await saveSettings(api, settings.revision, patch);
            await refresh();
        }
        finally {
            setBusy(false);
        }
    };
    const visionModels = models.filter(option => option.inputModalities === undefined || option.inputModalities.includes('image'));
    const currentModel = settings.enabled
        ? visionModels.find(option => option.provider === settings.provider && option.model === settings.model)
        : undefined;
    const currentModelLabel = !settings.enabled
        ? t('statusOff')
        : currentModel === undefined
            ? (settings.model.length > 0 ? settings.model : t('modelEmpty'))
            : `${currentModel.providerName} · ${currentModel.modelName}`;
    const currentEffortLabel = modelInfo?.reasoning?.efforts.find(effort => effort.id === settings.reasoningEffort)?.name ?? t('defaultEffort');
    const triggerLabel = status === 'describing'
        ? t('statusDescribing')
        : status === 'querying'
            ? t('statusQuerying')
            : settings.enabled
                ? (settings.model.length > 0 ? `${currentModelLabel} · ${t('visionPanel')}` : `${t('headerOn')} · ${t('visionPanel')}`)
                : t('statusOff');
    const lastAnsweredQa = (sessionData?.qas ?? []).filter(qa => qa.status === 'answered').at(-1);
    const computedContext = (lastAnsweredQa?.usage?.inputTokens ?? 0) + (lastAnsweredQa?.usage?.cacheReadTokens ?? 0);
    const contextUsed = Math.max(sessionData?.currentContextTokens ?? 0, computedContext);
    const contextTotal = modelInfo?.contextWindow ?? 0;
    const contextPercent = contextTotal > 0 ? Math.min(100, (contextUsed / contextTotal) * 100) : 0;
    const recentApiInput = contextUsed;
    const lastDescribe = (sessionData?.imageRecords ?? []).at(-1);
    const lastQuery = (sessionData?.qas ?? []).filter(qa => qa.status === 'answered').at(-1);
    const describeLatestInputValue = sessionData?.currentDescribeInput
        ?? ((lastDescribe?.usage?.inputTokens ?? 0) + (lastDescribe?.usage?.cacheReadTokens ?? 0));
    const describeLatestOutputValue = sessionData?.currentDescribeOutput ?? lastDescribe?.usage?.outputTokens ?? 0;
    const describeLatestElapsedValue = sessionData?.currentDescribeElapsedMs ?? lastDescribe?.elapsedMs ?? 0;
    const queryLatestInputValue = sessionData?.currentQueryInput
        ?? ((lastQuery?.usage?.inputTokens ?? 0) + (lastQuery?.usage?.cacheReadTokens ?? 0));
    const queryLatestOutputValue = sessionData?.currentQueryOutput ?? lastQuery?.usage?.outputTokens ?? 0;
    const queryLatestElapsedValue = sessionData?.currentQueryElapsedMs ?? lastQuery?.elapsedMs ?? 0;
    const describeLatestInput = describeLatestInputValue.toLocaleString();
    const describeLatestOutput = describeLatestOutputValue.toLocaleString();
    const describeLatestSeconds = Math.round(describeLatestElapsedValue / 1000);
    const queryLatestInput = queryLatestInputValue.toLocaleString();
    const queryLatestOutput = queryLatestOutputValue.toLocaleString();
    const queryLatestSeconds = Math.round(queryLatestElapsedValue / 1000);
    const describeInputTotal = (sessionData?.imageRecords ?? []).reduce((sum, record) => sum + (record.usage?.inputTokens ?? 0) + (record.usage?.cacheReadTokens ?? 0), 0);
    const describeOutputTotal = (sessionData?.imageRecords ?? []).reduce((sum, record) => sum + (record.usage?.outputTokens ?? 0), 0);
    const describeElapsedTotal = (sessionData?.imageRecords ?? []).reduce((sum, record) => sum + (record.elapsedMs ?? 0), 0);
    const queryInputTotal = (sessionData?.qas ?? [])
        .filter(qa => qa.status === 'answered')
        .reduce((sum, qa) => sum + (qa.usage?.inputTokens ?? 0) + (qa.usage?.cacheReadTokens ?? 0), 0);
    const queryOutputTotal = (sessionData?.qas ?? [])
        .filter(qa => qa.status === 'answered')
        .reduce((sum, qa) => sum + (qa.usage?.outputTokens ?? 0), 0);
    const queryElapsedTotal = (sessionData?.qas ?? [])
        .filter(qa => qa.status === 'answered')
        .reduce((sum, qa) => sum + (qa.elapsedMs ?? 0), 0);
    const describeInputText = describeInputTotal.toLocaleString();
    const describeOutputText = describeOutputTotal.toLocaleString();
    const describeSeconds = Math.round(describeElapsedTotal / 1000);
    const queryInputText = queryInputTotal.toLocaleString();
    const queryOutputText = queryOutputTotal.toLocaleString();
    const querySeconds = Math.round(queryElapsedTotal / 1000);
    return (_jsxs("div", { ref: rootRef, className: css.vaRoot, children: [_jsxs("button", { ref: triggerRef, type: "button", className: css.vaTrigger, "aria-haspopup": "menu", "aria-expanded": open, onClick: () => {
                    if (open) {
                        setOpen(false);
                        setPane('root');
                        setMenuPos(null);
                    }
                    else {
                        const rect = triggerRef.current?.getBoundingClientRect();
                        if (rect !== undefined) {
                            const width = 280;
                            const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
                            setMenuPos({ left, bottom: window.innerHeight - rect.top + 8 });
                        }
                        setPane('root');
                        setOpen(true);
                    }
                }, children: [_jsx("span", { className: css.vaTriggerLabel, children: triggerLabel }), _jsx("span", { className: css.vaChevron, children: open ? '▲' : '▼' })] }), open && (_jsxs("div", { className: css.vaMenu, role: "menu", style: menuPos === null ? undefined : { position: 'fixed', left: menuPos.left, bottom: menuPos.bottom, right: 'auto' }, children: [pane === 'root' && (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: css.vaCell, onClick: () => { setPane('model'); }, children: [_jsx("span", { children: t('model') }), _jsx("span", { className: css.vaCellValue, children: currentModelLabel }), _jsx("span", { className: css.vaCellChevron, children: "\u203A" })] }), modelInfo?.reasoning !== undefined && (_jsxs("button", { type: "button", className: css.vaCell, onClick: () => { setPane('effort'); }, children: [_jsx("span", { children: t('reasoningLevel') }), _jsx("span", { className: css.vaCellValue, children: currentEffortLabel }), _jsx("span", { className: css.vaCellChevron, children: "\u203A" })] })), contextTotal > 0 && (_jsxs("div", { className: css.vaContext, children: [_jsxs("div", { className: css.vaContextHeader, children: [_jsx("span", { children: t('contextUsed', { percent: contextPercent.toFixed(1) }) }), _jsxs("span", { children: ["~", contextUsed.toLocaleString(), " / ", contextTotal.toLocaleString()] })] }), _jsx("div", { className: css.vaContextBar, children: _jsx("div", { className: css.vaContextBarFill, style: { width: `${contextPercent}%` } }) }), _jsx("div", { className: css.vaContextBreakdown, children: _jsx("span", { children: t('officialContext', { value: recentApiInput.toLocaleString() }) }) }), _jsx("div", { className: css.vaContextModel, children: currentModelLabel })] })), sessionData !== null && (_jsxs("div", { className: css.vaDescribe, children: [_jsx("div", { className: css.vaDescribeTitle, children: t('describeTitle') }), _jsx("div", { className: css.vaDescribeRow, children: t('describeProcessed', { count: sessionData.stats.describeSteps ?? 0 }) }), _jsx("div", { className: css.vaDescribeRow, children: t('cumulativeStats', { input: describeInputText, output: describeOutputText, seconds: describeSeconds }) }), _jsx("div", { className: css.vaDescribeRow, children: t('latestStats', { input: describeLatestInput, output: describeLatestOutput, seconds: describeLatestSeconds }) })] })), sessionData !== null && (_jsxs("div", { className: css.vaDescribe, children: [_jsx("div", { className: css.vaDescribeTitle, children: t('qaTitle') }), _jsx("div", { className: css.vaDescribeRow, children: t('qaCount', { count: sessionData.stats.querySteps ?? 0 }) }), _jsx("div", { className: css.vaDescribeRow, children: t('cumulativeStats', { input: queryInputText, output: queryOutputText, seconds: querySeconds }) }), _jsx("div", { className: css.vaDescribeRow, children: t('latestStats', { input: queryLatestInput, output: queryLatestOutput, seconds: queryLatestSeconds }) })] }))] })), pane === 'model' && (_jsxs("div", { className: css.vaPane, children: [_jsxs("div", { className: css.vaMenuHeader, children: [_jsx("button", { type: "button", className: css.vaBack, onClick: () => { setPane('root'); }, children: t('back') }), _jsx("span", { children: t('model') })] }), _jsxs("div", { className: css.vaScroll, children: [_jsxs("button", { type: "button", className: css.vaOption, onClick: () => { void save({ enabled: false }); }, children: [_jsx("span", { children: t('close') }), !settings.enabled && _jsx("span", { className: css.vaCheck, children: "\u2713" })] }), visionModels.map((option) => {
                                        const active = settings.enabled
                                            && option.provider === settings.provider
                                            && option.model === settings.model;
                                        return (_jsxs("button", { type: "button", className: css.vaOption, onClick: () => { void save({ enabled: true, provider: option.provider, model: option.model }); }, children: [_jsxs("span", { className: css.vaOptionCopy, children: [_jsx("span", { className: css.vaOptionName, children: option.modelName }), _jsx("span", { className: css.vaOptionDesc, children: option.providerName })] }), active && _jsx("span", { className: css.vaCheck, children: "\u2713" })] }, `${option.provider}/${option.model}`));
                                    })] })] })), pane === 'effort' && modelInfo?.reasoning !== undefined && (_jsxs("div", { className: css.vaPane, children: [_jsxs("div", { className: css.vaMenuHeader, children: [_jsx("button", { type: "button", className: css.vaBack, onClick: () => { setPane('root'); }, children: t('back') }), _jsx("span", { children: t('reasoningLevel') })] }), _jsxs("div", { className: css.vaScroll, children: [_jsxs("button", { type: "button", className: css.vaOption, onClick: () => { void save({ reasoningEffort: '' }); }, children: [_jsx("span", { children: t('defaultEffort') }), (settings.reasoningEffort === undefined || settings.reasoningEffort === '') && _jsx("span", { className: css.vaCheck, children: "\u2713" })] }), modelInfo.reasoning.efforts.map(effort => (_jsxs("button", { type: "button", className: css.vaOption, onClick: () => { void save({ reasoningEffort: effort.id }); }, children: [_jsx("span", { children: effort.name }), settings.reasoningEffort === effort.id && _jsx("span", { className: css.vaCheck, children: "\u2713" })] }, effort.id)))] })] }))] }))] }));
}
export function VisionPanel({ sessionId, api, t }) {
    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState([]);
    const [stats, setStats] = useState(EMPTY_VISUAL_STATS);
    useEffect(() => {
        if (!open)
            return;
        void loadVisualData(api, sessionId, t).then(({ rows, stats }) => { setRows(rows); setStats(stats); });
    }, [open, api, sessionId]);
    return (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: open ? `${css.inputButton} ${css.inputButtonActive}` : css.inputButton, onClick: () => { setOpen(!open); }, children: t('visionPanel') }), open
                ? (_jsxs("div", { className: css.panel, children: [_jsx("div", { children: formatStats(t, stats) }), rows.length === 0
                            ? _jsx("div", { children: t('visionEmpty') })
                            : rows.map((row, index) => _jsxs("div", { className: row.kind === 'warn' ? `${css.panelRow} ${css.panelWarn}` : css.panelRow, children: [row.kind === 'q' ? t('rowQuestion') : row.kind === 'a' ? t('rowAnswer') : row.kind === 'desc' ? t('rowDescription') : t('rowWarning'), ": ", row.text] }, index))] }))
                : null] }));
}
const OPERATION_LABEL_KEYS = {
    toggle: 'opLabelToggle',
    'image-added': 'opLabelImageAdded',
    'describe-start': 'opLabelDescribeStart',
    'describe-end': 'opLabelDescribeEnd',
    'describe-failed': 'opLabelDescribeFailed',
    'query-asked': 'opLabelQueryAsked',
    'query-answered': 'opLabelQueryAnswered',
    'query-failed': 'opLabelQueryFailed',
    warning: 'opLabelWarning',
    'tool-invoked': 'opLabelToolInvoked',
    'main-request': 'opLabelMainRequest',
};
function operationLabel(t, type) {
    const key = OPERATION_LABEL_KEYS[type];
    return key === undefined ? type : t(key);
}
function operationText(t, op) {
    const d = op.data;
    switch (op.type) {
        case 'toggle': return t(d.enabled ? 'opToggleOn' : 'opToggleOff');
        case 'image-added': return t('opImageAdded', { no: String(d.imageNo ?? ''), name: String(d.name ?? '') });
        case 'describe-start': return t('opDescribeStart', { no: String(d.imageNo ?? '') });
        case 'describe-end': return t('opDescribeEnd', { no: String(d.imageNo ?? ''), summary: String(d.summary ?? ''), rawSummary: String(d.rawSummary ?? '') });
        case 'describe-failed': return t('opDescribeFailed', { no: String(d.imageNo ?? ''), message: String(d.message ?? '') });
        case 'query-asked': return t('opQueryAsked', { nos: Array.isArray(d.imageNos) ? d.imageNos.join(', ') : '', question: String(d.question ?? '') });
        case 'query-answered': return t('opQueryAnswered', { answer: String(d.answer ?? '') });
        case 'query-failed': return t('opQueryFailed', { message: String(d.message ?? '') });
        case 'warning': return t('opWarning', { message: String(d.message ?? '') });
        case 'tool-invoked': return t('opToolInvoked', { tool: String(d.tool ?? ''), nos: Array.isArray(d.imageNos) ? d.imageNos.join(', ') : '', detail: JSON.stringify(d, null, 2) });
        case 'main-request': return t('opMainRequest', { count: String(d.imageCount ?? ''), replaced: String(d.replacedCount ?? ''), preview: String(d.textPreview ?? '') });
        default: return JSON.stringify(d, null, 2);
    }
}
function CollapsibleOperationContent({ text, t }) {
    const ref = useRef(null);
    const [overflow, setOverflow] = useState(false);
    const [expanded, setExpanded] = useState(false);
    useLayoutEffect(() => {
        const el = ref.current;
        if (el === null || expanded)
            return;
        setOverflow(el.scrollHeight > el.clientHeight + 1);
    }, [text, expanded]);
    return (_jsxs("div", { className: overflow ? `${css.vaViewCollapsible} ${css.vaViewCollapsibleClickable}` : css.vaViewCollapsible, role: overflow ? 'button' : undefined, tabIndex: overflow ? 0 : undefined, "aria-expanded": overflow ? expanded : undefined, title: overflow ? (expanded ? t('collapse') : t('expand')) : undefined, onClick: () => { if (overflow)
            setExpanded(value => !value); }, onKeyDown: (event) => {
            if (!overflow)
                return;
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setExpanded(value => !value);
            }
        }, children: [_jsx("pre", { ref: ref, className: expanded ? `${css.vaViewContent} ${css.vaViewContentExpanded}` : `${css.vaViewContent} ${css.vaViewContentCollapsed}`, children: text }), overflow && _jsx("span", { className: css.vaViewHint, children: expanded ? t('collapse') : t('expand') })] }));
}
function visualOperationKind(type) {
    if (type.startsWith('describe'))
        return 'describe';
    if (type.startsWith('query'))
        return 'query';
    if (type === 'main-request')
        return 'main';
    if (type === 'image-added')
        return 'image';
    if (type === 'warning')
        return 'warning';
    return 'toggle';
}
export function VisualView({ sessionId, api, t }) {
    const [stats, setStats] = useState(EMPTY_VISUAL_STATS);
    const [operations, setOperations] = useState([]);
    const [data, setData] = useState(null);
    useEffect(() => {
        void loadVisualData(api, sessionId, t).then(({ stats, operations, data }) => { setStats(stats); setOperations(operations); setData(data); });
    }, [api, sessionId]);
    const exportJson = () => {
        if (data === null)
            return;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visual-aid-${String(sessionId)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };
    const exportMarkdown = () => {
        if (data === null)
            return;
        const lines = [
            t('exportMarkdownTitle', { sessionId: String(sessionId) }),
            '',
            t('exportMarkdownOperations'),
            '',
            ...operations.map(op => `- **${new Date(op.time).toLocaleString()}** [${op.turn === undefined ? t('turnUnknown') : t('turnLabel', { turn: op.turn })}] ${operationLabel(t, op.type)}: ${operationText(t, op)}`),
            '',
            t('exportMarkdownStats'),
            '',
            t('mdSteps', { value: String(stats.steps) }),
            t('mdAnswered', { value: String(stats.answered) }),
            t('mdInputTokens', { value: String(stats.input) }),
            t('mdOutputTokens', { value: String(stats.output) }),
            t('mdCacheRead', { value: String(stats.cacheRead) }),
            t('mdCacheWrite', { value: String(stats.cacheWrite) }),
            t('mdLlmTime', { value: String(stats.elapsedMs) }),
        ];
        const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visual-aid-${String(sessionId)}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };
    const groups = new Map();
    for (const op of operations) {
        const key = op.turn ?? -1;
        const list = groups.get(key);
        if (list === undefined)
            groups.set(key, [op]);
        else
            list.push(op);
    }
    const turnKeys = [...groups.keys()].sort((a, b) => a - b);
    return (_jsxs("div", { className: css.vaViewRoot, "data-conversation-composer-overlay": "", children: [_jsxs("div", { className: css.vaViewToolbar, role: "toolbar", children: [_jsx("span", { className: css.vaViewStats, children: formatStats(t, stats) }), _jsxs("div", { className: css.vaViewActions, children: [_jsx("button", { type: "button", className: css.vaViewButton, onClick: exportJson, children: t('exportJson') }), _jsx("button", { type: "button", className: css.vaViewButton, onClick: exportMarkdown, children: t('exportMarkdown') })] })] }), _jsx("div", { className: css.vaViewLedger, children: operations.length === 0
                    ? _jsx("div", { className: css.vaViewEmpty, children: t('visionEmpty') })
                    : (_jsx("div", { className: css.vaViewTable, children: turnKeys.map((turn) => {
                            const ops = groups.get(turn) ?? [];
                            const turnLabel = turn === -1 ? t('turnUnknown') : t('turnLabel', { turn });
                            return (_jsx("div", { className: css.vaViewTurn, children: ops.map((op, index) => (_jsxs("div", { className: css.vaViewRow, "data-turn-start": index === 0 || undefined, children: [_jsx("div", { className: css.vaViewTurnCell, children: index === 0 ? turnLabel : '' }), _jsx("div", { className: css.vaViewTagCell, children: _jsx("span", { className: css.vaViewTag, "data-kind": visualOperationKind(op.type), children: operationLabel(t, op.type) }) }), _jsxs("div", { className: css.vaViewContentCell, children: [_jsx("div", { className: css.vaViewMeta, children: new Date(op.time).toLocaleString() }), _jsx(CollapsibleOperationContent, { text: operationText(t, op), t: t })] })] }, index))) }, turn));
                        }) })) })] }));
}
//# sourceMappingURL=components.js.map