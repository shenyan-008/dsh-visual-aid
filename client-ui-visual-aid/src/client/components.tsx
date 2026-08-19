import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { IApiClient, SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import css from './VisualAidSection.module.css'
import { NS, type VisualAidKey } from './locales.ts'
import { loadAllModels, loadModelInfo, loadSessionData, loadSettings, saveSettings, type ModelInfo, type ModelOption, type VisualAidSessionData } from './store.ts'

export interface SettingsInjected { api: IApiClient }

interface VisualRow { kind: string; text: string }
interface VisualStats {
  answered: number
  steps: number
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  elapsedMs: number
  toolMs: number
}

const EMPTY_VISUAL_STATS: VisualStats = {
  answered: 0,
  steps: 0,
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  elapsedMs: 0,
  toolMs: 0,
}

async function loadVisualData(_api: IApiClient, sessionId: SessionId, t: (key: VisualAidKey, params?: Record<string, unknown>) => string): Promise<{ rows: VisualRow[]; stats: VisualStats; operations: VisualAidSessionData['operations']; data: VisualAidSessionData | null }> {
  try {
    const data = await loadSessionData(String(sessionId))
    const rows: VisualRow[] = []
    for (const q of data.qas) {
      if (q.status === 'answered') {
        if (typeof q.question === 'string') rows.push({ kind: 'q', text: q.question })
        if (typeof q.answer === 'string') rows.push({ kind: 'a', text: q.answer })
      }
    }
    for (const img of data.imageRecords) {
      if (img.status === 'described' && typeof img.summary === 'string') {
        rows.push({ kind: 'desc', text: t('imageSummary', { no: String(img.imageNo), summary: img.summary }) })
      } else if (img.status === 'failed' && typeof img.failure?.message === 'string') {
        rows.push({ kind: 'warn', text: t('imageDescribeFailed', { no: String(img.imageNo), message: img.failure.message }) })
      }
    }
    for (const w of data.warnings) {
      if (typeof w.message === 'string') rows.push({ kind: 'warn', text: w.message })
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
    }
  } catch {
    return { rows: [], stats: EMPTY_VISUAL_STATS, operations: [], data: null }
  }
}


function formatStats(t: (key: VisualAidKey, params?: Record<string, unknown>) => string, stats: VisualStats): string {
  return t('statsSummary', {
    answered: String(stats.answered),
    steps: String(stats.steps),
    seconds: String(Math.round(stats.elapsedMs / 1000)),
    toolMs: String(stats.toolMs),
    input: String(stats.input),
    output: String(stats.output),
    cacheRead: String(stats.cacheRead),
    cacheWrite: String(stats.cacheWrite),
  })
}

export function VisualAidSection({ api, t }: PropsRuntime<'settings.section'> & PropsLocale<typeof NS> & SettingsInjected) {
  const [state, setState] = useState<{ loading: boolean; saving: boolean; error: string | null; saved: boolean; enabled: boolean; provider: string; model: string; revision: number }>({ loading: true, saving: false, error: null, saved: false, enabled: false, provider: '', model: '', revision: 0 })
  const [models, setModels] = useState<ModelOption[]>([])
  const [draft, setDraft] = useState<Record<string, string | number | boolean>>({})

  useEffect(() => {
    void (async () => {
      try {
        const [value, all] = await Promise.all([loadSettings(api), loadAllModels(api)])
        const enabled = value.enabled === true
        const provider = typeof value.provider === 'string' ? value.provider : ''
        const model = typeof value.model === 'string' ? value.model : ''
        setState(prev => ({ ...prev, loading: false, enabled, provider, model, revision: typeof value === 'object' ? (value as { revision?: number }).revision ?? 0 : 0 }))
        setModels(all)
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
        })
        if (provider.length > 0 && model.length > 0) {
          void loadModelInfo(provider, model).then((info) => {
            const max = info.maxTokens
            if (max !== undefined) {
              setDraft(prev => ({
                ...prev,
                maxTokens: String(max),
                describeMaxTokens: String(Math.max(2048, Math.floor(max / 4))),
              }))
            }
          })
        }
      } catch (error) {
        setState(prev => ({ ...prev, loading: false, error: error instanceof Error ? error.message : String(error) }))
      }
    })()
  }, [api])

  const put = (key: string, value: string | number | boolean): void => { setDraft(prev => ({ ...prev, [key]: value })) }
  const save = async (): Promise<void> => {
    setState(prev => ({ ...prev, saving: true, error: null, saved: false }))
    try {
      const patch: Record<string, unknown> = {
        enabled: draft.enabled === true,
        describeImages: draft.describeImages === true,
        masqueradeMultimodal: draft.masqueradeMultimodal === true,
      }
      if (typeof draft.provider === 'string' && draft.provider.length > 0) patch.provider = draft.provider
      if (typeof draft.model === 'string' && draft.model.length > 0) patch.model = draft.model
      for (const key of ['maxTokens', 'timeoutMs', 'channelWindowRatio', 'describeMaxTokens'] as const) {
        const value = draft[key]
        if (typeof value === 'string' && value.length > 0) patch[key] = Number(value)
      }
      await saveSettings(api, state.revision, patch)
      setState(prev => ({ ...prev, saved: true }))
    } catch (error) {
      setState(prev => ({ ...prev, saving: false, error: error instanceof Error ? error.message : String(error) }))
    } finally {
      setState(prev => ({ ...prev, saving: false }))
    }
  }

  return (
    <div className={css.section}>
      <h2 className={css.title}>{t('nav')}</h2>
      <p className={css.intro}>{t('sectionIntro')}</p>
      <div className={css.form}>
        <label className={css.row}>
          <span className={css.rowText}>{t('enable')}</span>
          <input className={css.checkbox} type="checkbox" checked={draft.enabled === true} onChange={(event) => { put('enabled', event.target.checked) }} />
        </label>
        <label className={css.row}>
          <span className={css.rowText}>{t('model')}</span>
          <select className={css.control}
            value={String(models.findIndex(option => option.provider === draft.provider && option.model === draft.model))}
            onChange={(event) => {
              const index = Number(event.target.value)
              const option = models[index]
              if (option === undefined) {
                put('provider', '')
                put('model', '')
              } else {
                put('provider', option.provider)
                put('model', option.model)
                void (async () => {
                  const info = await loadModelInfo(option.provider, option.model)
                  const max = info.maxTokens ?? 4096
                  put('maxTokens', String(max))
                  put('describeMaxTokens', String(Math.max(2048, Math.floor(max / 4))))
                })()
              }
            }}
          >
            <option value="-1">{t('modelEmpty')}</option>
            {models.map((option, index) => <option key={`${option.provider}/${option.model}`} value={String(index)}>{option.providerName} · {option.modelName}</option>)}
          </select>
        </label>
        <label className={css.row}>
          <span className={css.rowText}>{t('maxTokens')}</span>
          <input className={css.control} value={String(draft.maxTokens ?? '')} onChange={(event) => { put('maxTokens', event.target.value) }} />
        </label>
        <label className={css.row}>
          <span className={css.rowText}>{t('timeoutMs')}</span>
          <input className={css.control} value={String(draft.timeoutMs ?? '')} onChange={(event) => { put('timeoutMs', event.target.value) }} />
        </label>
        <label className={css.row}>
          <span className={css.rowText}>{t('channelRatio')}</span>
          <input className={css.control} value={String(draft.channelWindowRatio ?? '')} onChange={(event) => { put('channelWindowRatio', event.target.value) }} />
        </label>
        <label className={css.row}>
          <span className={css.rowText}>{t('describe')}</span>
          <input className={css.checkbox} type="checkbox" checked={draft.describeImages === true} onChange={(event) => { put('describeImages', event.target.checked) }} />
        </label>
        <label className={css.row}>
          <span className={css.rowText}>{t('describeMaxTokens')}</span>
          <input className={css.control} value={String(draft.describeMaxTokens ?? '')} onChange={(event) => { put('describeMaxTokens', event.target.value) }} />
        </label>
        <label className={css.row}>
          <span className={css.rowText}>{t('masquerade')}</span>
          <input className={css.checkbox} type="checkbox" checked={draft.masqueradeMultimodal === true} onChange={(event) => { put('masqueradeMultimodal', event.target.checked) }} />
        </label>
      </div>
      {state.error !== null ? <div className={css.error}>{state.error}</div> : null}
      {state.saved ? <div className={css.saved}>{t('saved')}</div> : null}
      <div className={css.actions}>
        <button type="button" className={css.primaryButton} disabled={state.loading || state.saving} onClick={() => { void save() }}>{state.saving ? t('saving') : t('save')}</button>
      </div>
      <div className={css.usage}>
        <h3 className={css.usageTitle}>{t('usageTitle')}</h3>
        <ul className={css.usageList}>
          <li className={css.usageItem}>{t('usageStep1')}</li>
          <li className={css.usageItem}>{t('usageStep2')}</li>
          <li className={css.usageItem}>{t('usageStep3')}</li>
          <li className={css.usageItem}>{t('usageStep4')}</li>
          <li className={css.usageItem}>{t('usageStep5')}</li>
          <li className={css.usageItem}>{t('usageStep6')}</li>
        </ul>
        <h3 className={css.usageTitle}>{t('noticeTitle')}</h3>
        <ul className={css.usageList}>
          <li className={css.usageItem}>{t('notice1')}</li>
          <li className={css.usageItem}>{t('notice2')}</li>
          <li className={css.usageItem}>{t('notice3')}</li>
          <li className={css.usageItem}>{t('notice4')}</li>
          <li className={css.usageItem}>{t('notice5')}</li>
          <li className={css.usageItem}>{t('notice6')}</li>
        </ul>
      </div>
    </div>
  )
}

export interface ToggleInjected { api: IApiClient }

export function VisualAidToggle({ sessionId, api, t }: PropsRuntime<'conversation.input.left'> & PropsLocale<typeof NS> & ToggleInjected) {
  const [open, setOpen] = useState(false)
  const [pane, setPane] = useState<'root' | 'model' | 'effort'>('root')
  const [busy, setBusy] = useState(false)
  const [settings, setSettings] = useState<{ enabled: boolean; provider: string; model: string; reasoningEffort?: string; revision: number }>({ enabled: false, provider: '', model: '', revision: 0 })
  const [models, setModels] = useState<ModelOption[]>([])
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [sessionData, setSessionData] = useState<VisualAidSessionData | null>(null)
  const [status, setStatus] = useState<'idle' | 'describing' | 'querying'>('idle')
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [menuPos, setMenuPos] = useState<{ left: number; bottom: number } | null>(null)

  const refresh = async (): Promise<void> => {
    try {
      const [value, all] = await Promise.all([loadSettings(api), loadAllModels(api)])
      const enabled = value.enabled === true
      const provider = typeof value.provider === 'string' ? value.provider : ''
      const model = typeof value.model === 'string' ? value.model : ''
      const reasoningEffort = typeof value.reasoningEffort === 'string' ? value.reasoningEffort : undefined
      setSettings(prev => ({
        ...prev,
        enabled,
        provider,
        model,
        ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
        revision: (value as { revision?: number }).revision ?? 0,
      }))
      setModels(all)
      if (provider.length > 0 && model.length > 0) {
        setModelInfo(await loadModelInfo(provider, model))
      } else {
        setModelInfo(null)
      }
      try {
        const data = await loadSessionData(String(sessionId))
        setSessionData(data)
        const ops = data.operations ?? []
        let lastDescribeStart = 0
        let lastDescribeEnd = 0
        let lastQueryAsked = 0
        let lastQueryAnswered = 0
        for (const op of ops) {
          if (op.type === 'describe-start') lastDescribeStart = op.time
          else if (op.type === 'describe-end') lastDescribeEnd = op.time
          else if (op.type === 'query-asked') lastQueryAsked = op.time
          else if (op.type === 'query-answered') lastQueryAnswered = op.time
        }
        let nextStatus: 'idle' | 'describing' | 'querying' = 'idle'
        if (lastDescribeStart > lastDescribeEnd) nextStatus = 'describing'
        else if (lastQueryAsked > lastQueryAnswered) nextStatus = 'querying'
        setStatus(nextStatus)
      } catch {
        setSessionData(null)
        setStatus('idle')
      }
    } catch {
      // Keep last good state on transient failures.
    }
  }

  useEffect(() => {
    void refresh()
  }, [api, sessionId])

  useEffect(() => {
    if (!open) return
    void refresh()
    const closeOutside = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    return () => { document.removeEventListener('mousedown', closeOutside) }
  }, [open, api, sessionId])

  useEffect(() => {
    const timer = setInterval(() => { void refresh() }, 3000)
    return () => { clearInterval(timer) }
  }, [api, sessionId])

  const save = async (patch: Record<string, unknown>): Promise<void> => {
    if (busy) return
    setBusy(true)
    try {
      await saveSettings(api, settings.revision, patch)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const visionModels = models.filter(option =>
    option.inputModalities === undefined || option.inputModalities.includes('image'))

  const currentModel = visionModels.find(option => option.provider === settings.provider && option.model === settings.model)
  const currentModelLabel = currentModel === undefined
    ? (settings.model.length > 0 ? settings.model : t('modelEmpty'))
    : `${currentModel.providerName} · ${currentModel.modelName}`
  const currentEffortLabel = modelInfo?.reasoning?.efforts.find(effort => effort.id === settings.reasoningEffort)?.name ?? t('defaultEffort')
  const triggerLabel = status === 'describing'
    ? t('statusDescribing')
    : status === 'querying'
      ? t('statusQuerying')
      : settings.enabled
        ? (settings.model.length > 0 ? `${currentModelLabel} · ${t('visionPanel')}` : `${t('headerOn')} · ${t('visionPanel')}`)
        : t('statusOff')

  const lastAnsweredQa = (sessionData?.qas ?? []).filter(qa => qa.status === 'answered').at(-1)
  const computedContext = (lastAnsweredQa?.usage?.inputTokens ?? 0) + (lastAnsweredQa?.usage?.cacheReadTokens ?? 0)
  const contextUsed = Math.max(sessionData?.currentContextTokens ?? 0, computedContext)
  const contextTotal = modelInfo?.contextWindow ?? 0
  const contextPercent = contextTotal > 0 ? Math.min(100, (contextUsed / contextTotal) * 100) : 0
  const recentApiInput = contextUsed
  const lastDescribe = (sessionData?.imageRecords ?? []).at(-1)
  const lastQuery = (sessionData?.qas ?? []).filter(qa => qa.status === 'answered').at(-1)
  const describeLatestInputValue = sessionData?.currentDescribeInput
    ?? ((lastDescribe?.usage?.inputTokens ?? 0) + (lastDescribe?.usage?.cacheReadTokens ?? 0))
  const describeLatestOutputValue = sessionData?.currentDescribeOutput ?? lastDescribe?.usage?.outputTokens ?? 0
  const describeLatestElapsedValue = sessionData?.currentDescribeElapsedMs ?? lastDescribe?.elapsedMs ?? 0
  const queryLatestInputValue = sessionData?.currentQueryInput
    ?? ((lastQuery?.usage?.inputTokens ?? 0) + (lastQuery?.usage?.cacheReadTokens ?? 0))
  const queryLatestOutputValue = sessionData?.currentQueryOutput ?? lastQuery?.usage?.outputTokens ?? 0
  const queryLatestElapsedValue = sessionData?.currentQueryElapsedMs ?? lastQuery?.elapsedMs ?? 0
  const describeLatestInput = describeLatestInputValue.toLocaleString()
  const describeLatestOutput = describeLatestOutputValue.toLocaleString()
  const describeLatestSeconds = Math.round(describeLatestElapsedValue / 1000)
  const queryLatestInput = queryLatestInputValue.toLocaleString()
  const queryLatestOutput = queryLatestOutputValue.toLocaleString()
  const queryLatestSeconds = Math.round(queryLatestElapsedValue / 1000)
  const describeInputTotal = (sessionData?.imageRecords ?? []).reduce(
    (sum, record) => sum + (record.usage?.inputTokens ?? 0) + (record.usage?.cacheReadTokens ?? 0),
    0,
  )
  const describeOutputTotal = (sessionData?.imageRecords ?? []).reduce(
    (sum, record) => sum + (record.usage?.outputTokens ?? 0),
    0,
  )
  const describeElapsedTotal = (sessionData?.imageRecords ?? []).reduce(
    (sum, record) => sum + (record.elapsedMs ?? 0),
    0,
  )
  const queryInputTotal = (sessionData?.qas ?? [])
    .filter(qa => qa.status === 'answered')
    .reduce((sum, qa) => sum + (qa.usage?.inputTokens ?? 0) + (qa.usage?.cacheReadTokens ?? 0), 0)
  const queryOutputTotal = (sessionData?.qas ?? [])
    .filter(qa => qa.status === 'answered')
    .reduce((sum, qa) => sum + (qa.usage?.outputTokens ?? 0), 0)
  const queryElapsedTotal = (sessionData?.qas ?? [])
    .filter(qa => qa.status === 'answered')
    .reduce((sum, qa) => sum + (qa.elapsedMs ?? 0), 0)
  const describeInputText = describeInputTotal.toLocaleString()
  const describeOutputText = describeOutputTotal.toLocaleString()
  const describeSeconds = Math.round(describeElapsedTotal / 1000)
  const queryInputText = queryInputTotal.toLocaleString()
  const queryOutputText = queryOutputTotal.toLocaleString()
  const querySeconds = Math.round(queryElapsedTotal / 1000)

  return (
    <div ref={rootRef} className={css.vaRoot}>
      <button
        ref={triggerRef}
        type="button"
        className={css.vaTrigger}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false)
            setPane('root')
            setMenuPos(null)
          } else {
            const rect = triggerRef.current?.getBoundingClientRect()
            if (rect !== undefined) {
              const width = 280
              const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
              setMenuPos({ left, bottom: window.innerHeight - rect.top + 8 })
            }
            setPane('root')
            setOpen(true)
          }
        }}
      >
        <span className={css.vaTriggerLabel}>{triggerLabel}</span>
        <span className={css.vaChevron}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={css.vaMenu} role="menu" style={menuPos === null ? undefined : { position: 'fixed', left: menuPos.left, bottom: menuPos.bottom, right: 'auto' }}>
          {pane === 'root' && (
            <>
              <button type="button" className={css.vaCell} onClick={() => { setPane('model') }}>
                <span>{t('model')}</span>
                <span className={css.vaCellValue}>{currentModelLabel}</span>
                <span className={css.vaCellChevron}>›</span>
              </button>
              {modelInfo?.reasoning !== undefined && (
                <button type="button" className={css.vaCell} onClick={() => { setPane('effort') }}>
                  <span>{t('reasoningLevel')}</span>
                  <span className={css.vaCellValue}>{currentEffortLabel}</span>
                  <span className={css.vaCellChevron}>›</span>
                </button>
              )}
              {contextTotal > 0 && (
                <div className={css.vaContext}>
                  <div className={css.vaContextHeader}>
                    <span>{t('contextUsed', { percent: contextPercent.toFixed(1) })}</span>
                    <span>~{contextUsed.toLocaleString()} / {contextTotal.toLocaleString()}</span>
                  </div>
                  <div className={css.vaContextBar}>
                    <div className={css.vaContextBarFill} style={{ width: `${contextPercent}%` }} />
                  </div>
                  <div className={css.vaContextBreakdown}>
                    <span>{t('officialContext', { value: recentApiInput.toLocaleString() })}</span>
                  </div>
                  <div className={css.vaContextModel}>{currentModelLabel}</div>
                </div>
              )}
              {sessionData !== null && (
                <div className={css.vaDescribe}>
                  <div className={css.vaDescribeTitle}>{t('describeTitle')}</div>
                  <div className={css.vaDescribeRow}>{t('describeProcessed', { count: sessionData.stats.describeSteps ?? 0 })}</div>
                  <div className={css.vaDescribeRow}>
                    {t('cumulativeStats', { input: describeInputText, output: describeOutputText, seconds: describeSeconds })}
                  </div>
                  <div className={css.vaDescribeRow}>
                    {t('latestStats', { input: describeLatestInput, output: describeLatestOutput, seconds: describeLatestSeconds })}
                  </div>
                </div>
              )}
              {sessionData !== null && (
                <div className={css.vaDescribe}>
                  <div className={css.vaDescribeTitle}>{t('qaTitle')}</div>
                  <div className={css.vaDescribeRow}>{t('qaCount', { count: sessionData.stats.querySteps ?? 0 })}</div>
                  <div className={css.vaDescribeRow}>
                    {t('cumulativeStats', { input: queryInputText, output: queryOutputText, seconds: querySeconds })}
                  </div>
                  <div className={css.vaDescribeRow}>
                    {t('latestStats', { input: queryLatestInput, output: queryLatestOutput, seconds: queryLatestSeconds })}
                  </div>
                </div>
              )}
            </>
          )}

          {pane === 'model' && (
            <div className={css.vaPane}>
              <div className={css.vaMenuHeader}>
                <button type="button" className={css.vaBack} onClick={() => { setPane('root') }}>{t('back')}</button>
                <span>{t('model')}</span>
              </div>
              <div className={css.vaScroll}>
                <button
                  type="button"
                  className={css.vaOption}
                  onClick={() => { void save({ enabled: false }) }}
                >
                  <span>{t('close')}</span>
                  {!settings.enabled && <span className={css.vaCheck}>✓</span>}
                </button>
                {visionModels.map((option) => {
                  const active = option.provider === settings.provider && option.model === settings.model
                  return (
                    <button
                      key={`${option.provider}/${option.model}`}
                      type="button"
                      className={css.vaOption}
                      onClick={() => { void save({ enabled: true, provider: option.provider, model: option.model }) }}
                    >
                      <span className={css.vaOptionCopy}>
                        <span className={css.vaOptionName}>{option.modelName}</span>
                        <span className={css.vaOptionDesc}>{option.providerName}</span>
                      </span>
                      {active && <span className={css.vaCheck}>✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {pane === 'effort' && modelInfo?.reasoning !== undefined && (
            <div className={css.vaPane}>
              <div className={css.vaMenuHeader}>
                <button type="button" className={css.vaBack} onClick={() => { setPane('root') }}>{t('back')}</button>
                <span>{t('reasoningLevel')}</span>
              </div>
              <div className={css.vaScroll}>
                <button
                  type="button"
                  className={css.vaOption}
                  onClick={() => { void save({ reasoningEffort: '' }) }}
                >
                  <span>{t('defaultEffort')}</span>
                  {(settings.reasoningEffort === undefined || settings.reasoningEffort === '') && <span className={css.vaCheck}>✓</span>}
                </button>
                {modelInfo.reasoning.efforts.map(effort => (
                  <button
                    key={effort.id}
                    type="button"
                    className={css.vaOption}
                    onClick={() => { void save({ reasoningEffort: effort.id }) }}
                  >
                    <span>{effort.name}</span>
                    {settings.reasoningEffort === effort.id && <span className={css.vaCheck}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export interface VisionPanelInjected { api: IApiClient }

export function VisionPanel({ sessionId, api, t }: PropsRuntime<'conversation.input.left'> & PropsLocale<typeof NS> & VisionPanelInjected) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<VisualRow[]>([])
  const [stats, setStats] = useState<VisualStats>(EMPTY_VISUAL_STATS)
  useEffect(() => {
    if (!open) return
    void loadVisualData(api, sessionId, t).then(({ rows, stats }) => { setRows(rows); setStats(stats) })
  }, [open, api, sessionId])
  return (
    <>
      <button type="button" className={open ? `${css.inputButton} ${css.inputButtonActive}` : css.inputButton} onClick={() => { setOpen(!open) }}>{t('visionPanel')}</button>
      {open
        ? (
          <div className={css.panel}>
            <div>{formatStats(t, stats)}</div>
            {rows.length === 0
              ? <div>{t('visionEmpty')}</div>
              : rows.map((row, index) => <div key={index} className={row.kind === 'warn' ? `${css.panelRow} ${css.panelWarn}` : css.panelRow}>{row.kind === 'q' ? t('rowQuestion') : row.kind === 'a' ? t('rowAnswer') : row.kind === 'desc' ? t('rowDescription') : t('rowWarning')}: {row.text}</div>)}
          </div>
        )
        : null}
    </>
  )
}



const OPERATION_LABEL_KEYS: Record<string, string> = {
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
}

function operationLabel(t: (key: VisualAidKey, params?: Record<string, unknown>) => string, type: string): string {
  const key = OPERATION_LABEL_KEYS[type] as VisualAidKey | undefined
  return key === undefined ? type : t(key)
}

function operationText(t: (key: VisualAidKey, params?: Record<string, unknown>) => string, op: VisualAidSessionData['operations'][number]): string {
  const d = op.data as Record<string, unknown>
  switch (op.type) {
    case 'toggle': return t(d.enabled ? 'opToggleOn' : 'opToggleOff')
    case 'image-added': return t('opImageAdded', { no: String(d.imageNo ?? ''), name: String(d.name ?? '') })
    case 'describe-start': return t('opDescribeStart', { no: String(d.imageNo ?? '') })
    case 'describe-end': return t('opDescribeEnd', { no: String(d.imageNo ?? ''), summary: String(d.summary ?? ''), rawSummary: String(d.rawSummary ?? '') })
    case 'describe-failed': return t('opDescribeFailed', { no: String(d.imageNo ?? ''), message: String(d.message ?? '') })
    case 'query-asked': return t('opQueryAsked', { nos: Array.isArray(d.imageNos) ? (d.imageNos as number[]).join(', ') : '', question: String(d.question ?? '') })
    case 'query-answered': return t('opQueryAnswered', { answer: String(d.answer ?? '') })
    case 'query-failed': return t('opQueryFailed', { message: String(d.message ?? '') })
    case 'warning': return t('opWarning', { message: String(d.message ?? '') })
    case 'tool-invoked': return t('opToolInvoked', { tool: String(d.tool ?? ''), nos: Array.isArray(d.imageNos) ? (d.imageNos as number[]).join(', ') : '', detail: JSON.stringify(d, null, 2) })
    case 'main-request': return t('opMainRequest', { count: String(d.imageCount ?? ''), replaced: String(d.replacedCount ?? ''), preview: String(d.textPreview ?? '') })
    default: return JSON.stringify(d, null, 2)
  }
}

function CollapsibleOperationContent({ text, t }: { text: string; t: (key: VisualAidKey, params?: Record<string, unknown>) => string }) {
  const ref = useRef<HTMLPreElement | null>(null)
  const [overflow, setOverflow] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (el === null || expanded) return
    setOverflow(el.scrollHeight > el.clientHeight + 1)
  }, [text, expanded])

  return (
    <div
      className={overflow ? `${css.vaViewCollapsible} ${css.vaViewCollapsibleClickable}` : css.vaViewCollapsible}
      role={overflow ? 'button' : undefined}
      tabIndex={overflow ? 0 : undefined}
      aria-expanded={overflow ? expanded : undefined}
      title={overflow ? (expanded ? t('collapse') : t('expand')) : undefined}
      onClick={() => { if (overflow) setExpanded(value => !value) }}
      onKeyDown={(event) => {
        if (!overflow) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          setExpanded(value => !value)
        }
      }}
    >
      <pre
        ref={ref}
        className={expanded ? `${css.vaViewContent} ${css.vaViewContentExpanded}` : `${css.vaViewContent} ${css.vaViewContentCollapsed}`}
      >{text}</pre>
      {overflow && <span className={css.vaViewHint}>{expanded ? t('collapse') : t('expand')}</span>}
    </div>
  )
}

function visualOperationKind(type: string): string {
  if (type.startsWith('describe')) return 'describe'
  if (type.startsWith('query')) return 'query'
  if (type === 'main-request') return 'main'
  if (type === 'image-added') return 'image'
  if (type === 'warning') return 'warning'
  return 'toggle'
}

export function VisualView({ sessionId, api, t }: PropsRuntime<'conversation.view'> & PropsLocale<typeof NS> & VisionPanelInjected) {
  const [stats, setStats] = useState<VisualStats>(EMPTY_VISUAL_STATS)
  const [operations, setOperations] = useState<VisualAidSessionData['operations']>([])
  const [data, setData] = useState<VisualAidSessionData | null>(null)
  useEffect(() => {
    void loadVisualData(api, sessionId, t).then(({ stats, operations, data }) => { setStats(stats); setOperations(operations); setData(data) })
  }, [api, sessionId])
  const exportJson = (): void => {
    if (data === null) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `visual-aid-${String(sessionId)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  const exportMarkdown = (): void => {
    if (data === null) return
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
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `visual-aid-${String(sessionId)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }
  const groups = new Map<number, VisualAidSessionData['operations']>()
  for (const op of operations) {
    const key = op.turn ?? -1
    const list = groups.get(key)
    if (list === undefined) groups.set(key, [op])
    else list.push(op)
  }
  const turnKeys = [...groups.keys()].sort((a, b) => a - b)
  return (
    <div className={css.vaViewRoot} data-conversation-composer-overlay="">
      <div className={css.vaViewToolbar} role="toolbar">
        <span className={css.vaViewStats}>{formatStats(t, stats)}</span>
        <div className={css.vaViewActions}>
          <button type="button" className={css.vaViewButton} onClick={exportJson}>{t('exportJson')}</button>
          <button type="button" className={css.vaViewButton} onClick={exportMarkdown}>{t('exportMarkdown')}</button>
        </div>
      </div>
      <div className={css.vaViewLedger}>
        {operations.length === 0
          ? <div className={css.vaViewEmpty}>{t('visionEmpty')}</div>
          : (
            <div className={css.vaViewTable}>
              {turnKeys.map((turn) => {
                const ops = groups.get(turn) ?? []
                const turnLabel = turn === -1 ? t('turnUnknown') : t('turnLabel', { turn })
                return (
                  <div key={turn} className={css.vaViewTurn}>
                    {ops.map((op, index) => (
                      <div key={index} className={css.vaViewRow} data-turn-start={index === 0 || undefined}>
                        <div className={css.vaViewTurnCell}>{index === 0 ? turnLabel : ''}</div>
                        <div className={css.vaViewTagCell}>
                          <span className={css.vaViewTag} data-kind={visualOperationKind(op.type)}>{operationLabel(t, op.type)}</span>
                        </div>
                        <div className={css.vaViewContentCell}>
                          <div className={css.vaViewMeta}>{new Date(op.time).toLocaleString()}</div>
                          <CollapsibleOperationContent text={operationText(t, op)} t={t} />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
      </div>
    </div>
  )
}
