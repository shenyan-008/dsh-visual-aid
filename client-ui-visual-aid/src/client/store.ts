import type { IApiClient } from '@deepseek-ai/dsh-api-remotes/client'

export const VISUAL_AID_NS = 'visual-aid'

export interface ModelOption {
  provider: string
  providerName: string
  model: string
  modelName: string
  maxTokens?: number
  contextWindow?: number
  inputModalities?: string[]
}

const SETTINGS_ENDPOINT = '/api/visual-aid/settings'

async function errorFrom(response: Response, fallback: string): Promise<Error> {
  let message = fallback
  try {
    const data = await response.json() as { error?: string }
    if (typeof data.error === 'string' && data.error.length > 0) message = data.error
  } catch {
    // keep fallback
  }
  return new Error(message)
}

export async function loadSettings(_api: IApiClient): Promise<Record<string, unknown>> {
  const response = await fetch(SETTINGS_ENDPOINT)
  if (!response.ok) throw await errorFrom(response, `failed to load visual-aid settings (${response.status})`)
  const data = await response.json() as { value?: Record<string, unknown>; revision?: number }
  return { ...(data.value ?? {}), revision: data.revision ?? 0 }
}

export async function saveSettings(_api: IApiClient, revision: number, patch: Record<string, unknown>): Promise<void> {
  const response = await fetch(SETTINGS_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ revision, patch }),
  })
  if (!response.ok) throw await errorFrom(response, `failed to save visual-aid settings (${response.status})`)
}

export async function loadAllModels(api: IApiClient): Promise<ModelOption[]> {
  const response = await api.llm.models({})
  if (!response.result.ok) return []
  return response.result.value.groups.flatMap(group => group.models.map(model => ({
    provider: group.id,
    providerName: group.name,
    model: model.id,
    modelName: model.name,
    ...(() => {
      const maybe = model as { inputModalities?: unknown }
      return Array.isArray(maybe.inputModalities)
        ? { inputModalities: maybe.inputModalities as string[] }
        : {}
    })(),
  })))
}


export interface VisualAidSessionData {
  enabled: boolean
  provider?: string
  model?: string
  imageRecords: Array<{
    imageNo: number
    attachmentId: string
    mediaType: string
    bytes: number
    width: number
    height: number
    name?: string
    status: string
    summary?: string
    failure?: { message: string; code?: string }
    elapsedMs?: number
    usage?: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number }
  }>
  qas: Array<{
    imageNos: number[]
    question: string
    status: string
    route: { provider: string; model: string }
    answer?: string
    failure?: { message: string; code?: string }
    usage?: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number }
    elapsedMs?: number
  }>
  nextImageNo: number
  warnings: Array<{ imageNos: number[]; message: string }>
  stats: {
    visualSteps: number
    visualAnswered: number
    visualInput: number
    visualOutput: number
    visualCacheRead: number
    visualCacheWrite: number
    visualElapsedMs: number
    visualToolMs: number
    describeSteps: number
    describeInput: number
    describeOutput: number
    describeElapsedMs: number
    querySteps: number
    queryInput: number
    queryOutput: number
    queryElapsedMs: number
  }
  currentContextTokens?: number
  currentDescribeInput?: number
  currentDescribeOutput?: number
  currentDescribeElapsedMs?: number
  currentQueryInput?: number
  currentQueryOutput?: number
  currentQueryElapsedMs?: number
  operations: Array<{
    type: string
    time: number
    turn?: number
    data: Record<string, unknown>
  }>
}

export async function loadSessionData(sessionId: string): Promise<VisualAidSessionData> {
  const response = await fetch(`/api/visual-aid/session?sessionId=${encodeURIComponent(sessionId)}`)
  if (!response.ok) throw await errorFrom(response, `failed to load visual-aid session data (${response.status})`)
  return await response.json() as VisualAidSessionData
}


export interface ModelInfo {
  maxTokens?: number
  contextWindow?: number
  reasoning?: {
    efforts: Array<{ id: string; name: string; description?: string }>
    defaultEffort?: string
  }
}

export async function loadModelInfo(provider: string, model: string): Promise<ModelInfo> {
  const response = await fetch(`/api/visual-aid/model-info?provider=${encodeURIComponent(provider)}&model=${encodeURIComponent(model)}`)
  if (!response.ok) return {}
  return await response.json() as ModelInfo
}
