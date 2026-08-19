import z from '@deepseek-ai/schemastery'

export interface VisualAidConfig {
  storageDir?: string
  enabled?: boolean
  provider?: string
  model?: string
  maxTokens?: number
  timeoutMs?: number
  channelWindowRatio?: number
  describeImages?: boolean
  describeMaxTokens?: number
  masqueradeMultimodal?: boolean
  reasoningEffort?: string
}

export const VisualAidConfigSchema: z<VisualAidConfig> = z.object({
  storageDir: z.string(),
  enabled: z.boolean().default(false),
  provider: z.string(),
  model: z.string(),
  maxTokens: z.number().step(1).min(1),
  timeoutMs: z.number().step(1).min(1),
  channelWindowRatio: z.number().min(0.1).max(0.95).default(0.85),
  describeImages: z.boolean().default(true),
  describeMaxTokens: z.number().step(1).min(1).default(512),
  masqueradeMultimodal: z.boolean().default(false),
  reasoningEffort: z.string(),
})

export const DEFAULT_MAX_TOKENS = 4096
export const DEFAULT_TIMEOUT_MS = 120_000
