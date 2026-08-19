import { Context, Service } from '@deepseek-ai/cordis'
import { AttachmentError } from '@deepseek-ai/dsh-attachment'
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { createUserMessage, deepFreeze } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, Message, StreamChunk } from '@deepseek-ai/dsh-llm'
import { BlockAssembler } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { Session } from '@deepseek-ai/dsh-session'
// Type-only: merges ctx.commands for the optional session toggle.
import type { CommandInvocation } from '@deepseek-ai/dsh-commands'
import type {} from '@deepseek-ai/dsh-host-webserver'
// Type-only: merges ctx.fs for the plugin-owned visual_read_image tool.
import type {} from '@deepseek-ai/dsh-fs'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import { deadline } from '@deepseek-ai/dsh-timeout'
import z from '@deepseek-ai/schemastery'
import { basename, extname, join } from 'node:path'
import { homedir, tmpdir } from 'node:os'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { DEFAULT_MAX_TOKENS, DEFAULT_TIMEOUT_MS, VisualAidConfigSchema, type VisualAidConfig } from './config.ts'
import {
  buildVisualRequest, collectImageRecords, DESCRIBE_PROMPT, DESCRIBE_SYSTEM,
  foldImageStates, substituteImages, VISUAL_SYSTEM,
} from './channel.ts'
import type { ImageRecord, VisualQa } from './channel.ts'

const DEFAULT_MAX_RETRIES = 2

export const NAME = '@deepseek-ai/dsh-visual-aid'
const NS = settingsNamespace('visual-aid')

declare module '@deepseek-ai/cordis' {
  interface Context { visualAid: VisualAidService }
}

const IMAGE_EXTENSIONS: Readonly<Record<string, ImageAttachmentRef['mediaType']>> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
}

interface VisualAidOperation {
  type: 'toggle' | 'image-added' | 'describe-start' | 'describe-end' | 'describe-failed' | 'query-asked' | 'query-answered' | 'query-failed' | 'warning' | 'tool-invoked' | 'main-request'
  time: number
  turn?: number
  data: Record<string, unknown>
}

interface VisualAidStats {
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

interface VisualAidQueryRecord {
  imageNos: number[]
  question: string
  status: 'asked' | 'answered' | 'failed'
  route: { provider: string; model: string }
  answer?: string
  failure?: { message: string; code?: string }
  usage?: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number }
  elapsedMs?: number
}

interface VisualAidSessionData {
  enabled?: { enabled: boolean; provider?: string; model?: string }
  imageRecords: Map<number, ImageRecord>
  qas: VisualAidQueryRecord[]
  nextImageNo: number
  warnings: Array<{ imageNos: number[]; message: string }>
  stats: VisualAidStats
  operations: VisualAidOperation[]
  currentContextTokens?: number
  currentDescribeInput?: number
  currentDescribeOutput?: number
  currentDescribeElapsedMs?: number
  currentQueryInput?: number
  currentQueryOutput?: number
  currentQueryElapsedMs?: number
}

function emptyVisualAidStats(): VisualAidStats {
  return {
    visualSteps: 0,
    visualAnswered: 0,
    visualInput: 0,
    visualOutput: 0,
    visualCacheRead: 0,
    visualCacheWrite: 0,
    visualElapsedMs: 0,
    visualToolMs: 0,
    describeSteps: 0,
    describeInput: 0,
    describeOutput: 0,
    describeElapsedMs: 0,
    querySteps: 0,
    queryInput: 0,
    queryOutput: 0,
    queryElapsedMs: 0,
  }
}

function extractCleanDescription(raw: string): string {
  const markers = [
    'FINAL_DESCRIPTION:',
    'Final Output:',
    '**Final Output:**',
    'Final Answer:',
    '**Final Answer:**',
    'Final output:',
  ]
  let best = raw
  for (const marker of markers) {
    const index = raw.lastIndexOf(marker)
    if (index !== -1) {
      const candidate = raw.slice(index + marker.length).trim()
      if (candidate.length > 0) best = candidate
    }
  }
  if (best !== raw) return best
  const starters = [
    'This image is',
    'The image is',
    'Based on the image',
    'Here is the',
    'Here is a',
    'Sure, here',
    'The table',
    'The screenshot',
  ]
  let bestStart = -1
  for (const starter of starters) {
    const index = raw.lastIndexOf(starter)
    if (index > bestStart) bestStart = index
  }
  if (bestStart > 0) {
    const candidate = raw.slice(bestStart).trim()
    if (candidate.length > 0) return candidate
  }
  return raw
}

export default class VisualAidService extends Service {
  static Config: z<VisualAidConfig> = VisualAidConfigSchema
  static inject = ['llm', 'sessions', 'tools', 'systemPrompt']

  private current = {
    enabled: false,
    provider: '',
    model: '',
    maxTokens: undefined as number | undefined,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    channelWindowRatio: 0.85,
    describeImages: true,
    describeMaxTokens: 512,
    masqueradeMultimodal: false,
    reasoningEffort: undefined as string | undefined,
  }
  private targetCache: {
    key: string
    promise: Promise<{ provider: string; model: string; defaultMaxTokens?: number; contextWindow?: number } | undefined>
  } | undefined
  private toolDisposers: Array<() => void> = []
  private agentToolCleanups = new Map<SessionId, () => void | Promise<void>>()
  private sessionData = new Map<SessionId, VisualAidSessionData>()
  private storageDir: string
  private inFlight = new Map<string, Map<number, Promise<void>>>()
  private projected = new WeakSet<GenerateOptions>()

  constructor(ctx: Context, config: VisualAidConfig) {
    super(ctx, 'visualAid')
    if (config.storageDir !== undefined) {
      this.storageDir = config.storageDir
      mkdirSync(this.storageDir, { recursive: true })
    } else {
      const defaultDir = join(homedir(), '.dsh', 'visual-aid')
      try {
        mkdirSync(defaultDir, { recursive: true })
        writeFileSync(join(defaultDir, '.write-test'), '')
        rmSync(join(defaultDir, '.write-test'), { force: true })
        this.storageDir = defaultDir
      } catch {
        this.storageDir = join(tmpdir(), 'dsh-visual-aid')
        mkdirSync(this.storageDir, { recursive: true })
      }
    }
    let source: (() => VisualAidConfig) | undefined
    installSettingsSection(ctx, NS, VisualAidConfigSchema, config, {
      setSource: (read) => { source = read; this.applyConfig(read()) },
      onChange: () => {
        this.applyConfig(source?.() ?? config)
        this.invalidateTarget()
        this.refreshTool()
        this.refreshAllAgentTools()
      },
    })
    this.applyConfig(config)
    this.patchResolveModelInfo()
    ctx.on('llm/stream', (options, next) => this.project(options, next), { global: true })
    ctx.on('session/event', (_session, event) => {
      if (event.type === 'visual-aid/toggle') {
        const agent = this.ctx.get('agents')?.get(_session.id)
        if (agent !== undefined) this.refreshAgentTools(agent)
      }
      if (event.type === 'user/message' || event.type === 'tool/result') {
        if (!this.enabledFor(_session)) return
        const content = event.type === 'user/message'
          ? (event.data as { content: readonly import('@deepseek-ai/dsh-llm').ContentBlock[] }).content
          : (event.data as { message: { content: readonly import('@deepseek-ai/dsh-llm').ContentBlock[] } }).message.content
        const hasImage = content.some(block => block.type === 'image'
          || (block.type === 'tool-result' && block.content.some(inner => inner.type === 'image')))
        if (hasImage) void this.settleDescriptions(_session, undefined, undefined)
      }
    })
    ctx.on('session/created', (session) => { this.inheritSessionData(session) }, { global: true })
    ctx.on('llm/adapters-updated', () => { this.invalidateTarget() })
    // Session-level switch: /visual-aid on|off. Optional service; UI falls
    // back to the global settings switch when commands are not mounted.
    // Plugin-owned paste-upload endpoint. The standard upload preflight would
    // reject images for a text-only main model, so this route is the pure-plugin
    // alternative; it still commits through the normal attachment service and
    // injects an ordinary user message into the addressed session.
    ctx.inject(['webServer', 'agents', 'attachments'], (uploadCtx) => {
      const route = uploadCtx.webServer.register({
        kind: 'exact',
        path: '/api/visual-aid/upload',
        handler: async (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => {
          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(Buffer.from(chunk as Buffer))
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
              sessionId?: string
              name?: string
              mediaType?: string
              data?: string
              text?: string
              images?: Array<{ mediaType: string; data: string; name?: string }>
            }
            const sessionId = body.sessionId
            const images = body.images ?? (body.data === undefined || body.mediaType === undefined
              ? []
              : [{ mediaType: body.mediaType, data: body.data, ...body.name === undefined ? {} : { name: body.name } }])
            if (sessionId === undefined || images.length === 0) {
              res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'sessionId and at least one image are required' }))
              return
            }
            const agent = uploadCtx.agents.get(SessionId(sessionId))
            if (agent === undefined) {
              res.writeHead(404, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'session not found' }))
              return
            }
            const content: import('@deepseek-ai/dsh-llm').ContentBlock[] = []
            for (const image of images) {
              const bytes = Buffer.from(image.data, 'base64')
              const ref = await uploadCtx.attachments.saveImage({
                data: bytes,
                mediaType: image.mediaType as never,
                ...image.name === undefined ? {} : { name: image.name },
              })
              content.push({ type: 'image', attachment: { attachmentId: ref.attachmentId, mediaType: ref.mediaType, bytes: ref.bytes, width: ref.width, height: ref.height, ...ref.name === undefined ? {} : { name: ref.name } } })
            }
            const text = typeof body.text === 'string' ? body.text : ''
            if (text.length > 0) content.push({ type: 'text', text })
            const message = createUserMessage({ content, source: { kind: 'user' } })
            agent.followup(message)
            res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true }))
          } catch (error) {
            res.writeHead(500, { 'content-type': 'application/json' }).end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
          }
        },
      })
      this.ctx.effect(() => () => { route() }, 'visual-aid upload route')
    })

    // Plugin-owned settings endpoint: the host API proxy only exposes an
    // explicit allowlist to configuration clients, so a pure plugin cannot add
    // its namespace there without changing dsh source. This route talks to the
    // same-process settings service directly and lets the UI read/write the
    // visual-aid namespace without host-source modification.
    ctx.inject(['webServer', 'settings'], (settingsCtx) => {
      const route = settingsCtx.webServer.register({
        kind: 'exact',
        path: '/api/visual-aid/settings',
        handler: async (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => {
          try {
            if (req.method === 'GET') {
              const descriptor = settingsCtx.settings.describe().find(entry => entry.ns === NS)
              if (descriptor === undefined) {
                res.writeHead(404, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'visual-aid settings namespace is not registered' }))
                return
              }
              res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ value: descriptor.value, revision: descriptor.revision, schema: descriptor.schema }))
              return
            }
            if (req.method === 'POST') {
              const chunks: Buffer[] = []
              for await (const chunk of req) chunks.push(Buffer.from(chunk as Buffer))
              const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { revision?: number; patch?: Record<string, unknown> }
              if (body.patch === undefined || typeof body.patch !== 'object') {
                res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'patch is required' }))
                return
              }
              await settingsCtx.settings.update(NS, body.patch)
              const descriptor = settingsCtx.settings.describe().find(entry => entry.ns === NS)
              res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, value: descriptor?.value, revision: descriptor?.revision }))
              return
            }
            res.writeHead(405, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'method not allowed' }))
          } catch (error) {
            res.writeHead(500, { 'content-type': 'application/json' }).end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
          }
        },
      })
      this.ctx.effect(() => () => { route() }, 'visual-aid settings route')
    })

    ctx.inject(['webServer'], (sessionCtx) => {
      const route = sessionCtx.webServer.register({
        kind: 'exact',
        path: '/api/visual-aid/session',
        handler: async (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => {
          const url = new URL(req.url ?? '/', 'http://x')
          const sessionId = url.searchParams.get('sessionId')
          if (sessionId === null) {
            res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'sessionId is required' }))
            return
          }
          const session = this.ctx.sessions.get(SessionId(sessionId))
          if (session === undefined) {
            res.writeHead(404, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'session not found' }))
            return
          }
          const data = this.dataFor(session)
          res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
            enabled: this.enabledFor(session),
            provider: data.enabled?.provider,
            model: data.enabled?.model,
            imageRecords: [...data.imageRecords.values()],
            qas: data.qas,
            nextImageNo: data.nextImageNo,
            warnings: data.warnings,
            stats: data.stats,
            operations: data.operations,
            ...(data.currentContextTokens === undefined ? {} : { currentContextTokens: data.currentContextTokens }),
            ...(data.currentDescribeInput === undefined ? {} : { currentDescribeInput: data.currentDescribeInput }),
            ...(data.currentDescribeOutput === undefined ? {} : { currentDescribeOutput: data.currentDescribeOutput }),
            ...(data.currentDescribeElapsedMs === undefined ? {} : { currentDescribeElapsedMs: data.currentDescribeElapsedMs }),
            ...(data.currentQueryInput === undefined ? {} : { currentQueryInput: data.currentQueryInput }),
            ...(data.currentQueryOutput === undefined ? {} : { currentQueryOutput: data.currentQueryOutput }),
            ...(data.currentQueryElapsedMs === undefined ? {} : { currentQueryElapsedMs: data.currentQueryElapsedMs }),
          }))
        },
      })
      this.ctx.effect(() => () => { route() }, 'visual-aid session route')
    })

    ctx.inject(['webServer'], (modelCtx) => {
      const route = modelCtx.webServer.register({
        kind: 'exact',
        path: '/api/visual-aid/model-info',
        handler: async (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => {
          const url = new URL(req.url ?? '/', 'http://x')
          const provider = url.searchParams.get('provider')
          const model = url.searchParams.get('model')
          if (provider === null || model === null) {
            res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'provider and model are required' }))
            return
          }
          try {
            const info = await this.ctx.llm.resolveModelInfo(provider, model)
            res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
              maxTokens: info?.defaultMaxTokens,
              contextWindow: info?.context?.contextWindow,
              reasoning: info?.reasoning,
            }))
          } catch {
            res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({}))
          }
        },
      })
      this.ctx.effect(() => () => { route() }, 'visual-aid model-info route')
    })

    ctx.inject(['webServer'], (toggleCtx) => {
      const route = toggleCtx.webServer.register({
        kind: 'exact',
        path: '/api/visual-aid/session-toggle',
        handler: async (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => {
          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(Buffer.from(chunk as Buffer))
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { sessionId?: string; enabled?: boolean }
            if (body.sessionId === undefined || typeof body.enabled !== 'boolean') {
              res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'sessionId and enabled are required' }))
              return
            }
            const session = this.ctx.sessions.get(SessionId(body.sessionId))
            if (session === undefined) {
              res.writeHead(404, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'session not found' }))
              return
            }
            this.dataFor(session).enabled = { enabled: body.enabled }
            this.recordOperation(session, 'toggle', { enabled: body.enabled })
            res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true }))
          } catch (error) {
            res.writeHead(500, { 'content-type': 'application/json' }).end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
          }
        },
      })
      this.ctx.effect(() => () => { route() }, 'visual-aid session-toggle route')
    })

    ctx.inject(['commands', 'settings'], (commandCtx) => {
      commandCtx.commands.register({
        name: 'visual-aid',
        description: 'Enable or disable visual aid for this session',
        input: { hint: 'on or off' },
        handler: async (invocation: CommandInvocation) => {
          const session = invocation.agent.session
          const on = invocation.rawInput.trim().toLowerCase() === 'on'
          const off = invocation.rawInput.trim().toLowerCase() === 'off'
          if (!on && !off) throw new Error('/visual-aid expects "on" or "off"')
          await commandCtx.settings.update(NS, { enabled: on })
          this.recordOperation(session, 'toggle', { enabled: on })
          const agent = this.ctx.get('agents')?.get(session.id)
          if (agent !== undefined) this.refreshAgentTools(agent)
          return { kind: 'success' as const, text: on ? 'visual aid enabled for this session' : 'visual aid disabled for this session' }
        },
      })
    })
    ctx.systemPrompt.section({
      name: 'visual-aid', order: 120,
      text: (context) => {
        const enabled = context.agent === undefined ? this.current.enabled : this.enabledFor(context.agent.session)
        if (!enabled) {
          const session = context.agent?.session
          const hasImageData = session !== undefined && this.dataFor(session).imageRecords.size > 0
          return hasImageData ? 'Visual aid is now disabled. You see original images directly; view_image has been removed.' : ''
        }
        const session = context.agent?.session
        const records = session === undefined ? [] : this.recordsFor(session)
        const descriptions = records
          .filter(record => record.status === 'described' && record.summary !== undefined)
          .map(record => `Image #${record.imageNo}: ${record.summary}`)
          .join('\n\n')
        return `Visual aid is active. Images have already been converted into detailed text placeholders containing the full image content. Use that text as the source of truth and answer from it directly. Do NOT call view_image(#N, question) merely because the user asks about an image or because a description exists; only call view_image if the placeholder is missing information or you need to verify a specific detail that is not already present. Subagents inherit visual aid when the parent session has it enabled, but the native subagent tool cannot pass images. When creating a subagent that needs image content, you MUST include the full text description of the image in the subagent prompt, not just an image reference.\n\nCurrent image descriptions:\n${descriptions.length > 0 ? descriptions : '(none available yet)'}`
      },
    })
    this.refreshTool()
    ctx.on('agent/created', ({ agent }) => { this.refreshAgentTools(agent) })
    ctx.on('agent/disposed', ({ agent }) => { this.agentToolCleanups.delete(agent.id) })
    ctx.on('session/disposed', (session) => { this.removeSessionData(session) })
  }

  private patchResolveModelInfo(): void {
    const llm = this.ctx.llm as unknown as {
      resolveModelInfo: (
        provider: string,
        model: string,
        signal?: AbortSignal,
      ) => Promise<{ inputModalities?: string[]; [key: string]: unknown }>
    }
    const original = llm.resolveModelInfo.bind(llm)
    llm.resolveModelInfo = async (provider, model, signal) => {
      const info = await original(provider, model, signal)
      if (!this.current.masqueradeMultimodal) return info
      // Do not fake the configured vision model itself; only allow text-only
      // main models to appear image-capable so dsh lets the user switch.
      if (provider === this.current.provider && model === this.current.model) return info
      const modalities = info.inputModalities ?? []
      if (modalities.includes('image')) return info
      return { ...info, inputModalities: [...modalities, 'image'] }
    }
  }

  private applyConfig(config: VisualAidConfig): void {
    this.current = {
      enabled: config.enabled === true,
      provider: config.provider ?? '',
      model: config.model ?? '',
      maxTokens: config.maxTokens,
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      channelWindowRatio: config.channelWindowRatio ?? 0.85,
      describeImages: config.describeImages !== false,
      describeMaxTokens: config.describeMaxTokens ?? 512,
      masqueradeMultimodal: config.masqueradeMultimodal === true,
      reasoningEffort: config.reasoningEffort,
    }
  }

  private invalidateTarget(): void { this.targetCache = undefined }

  private resolveTarget(
    session: Session,
    signal?: AbortSignal,
  ): Promise<{ provider: string; model: string; defaultMaxTokens?: number; contextWindow?: number } | undefined> {
    const override = this.sessionOverride(session)
    const provider = override?.provider ?? this.current.provider
    const model = override?.model ?? this.current.model
    const key = `${provider}\u0000${model}`
    if (this.targetCache?.key === key) return this.targetCache.promise
    const promise = (async () => {
      if (provider.length === 0 || model.length === 0) return undefined
      try {
        const info = await this.ctx.llm.resolveModelInfo(provider, model, signal)
        if (info.inputModalities !== undefined && !info.inputModalities.includes('image')) return undefined
        return {
          provider,
          model,
          ...info.defaultMaxTokens === undefined ? {} : { defaultMaxTokens: info.defaultMaxTokens },
          ...info.context?.contextWindow === undefined ? {} : { contextWindow: info.context.contextWindow },
        }
      } catch { return undefined }
    })()
    this.targetCache = { key, promise }
    return promise
  }

  sessionOverride(session: Session): { enabled: boolean; provider?: string; model?: string } | undefined {
    const stored = this.dataFor(session).enabled
    if (stored !== undefined) return { ...stored }
    let latest: { enabled: boolean; provider?: string; model?: string } | undefined
    for (const event of session.events) if (event.type === 'visual-aid/toggle') latest = { ...event.data }
    return latest
  }

  enabledFor(session?: Session): boolean {
    if (session === undefined) return false
    if (!this.current.enabled) return false
    const provider = this.current.provider
    const model = this.current.model
    return provider.length > 0 && model.length > 0
  }

  private hasConfiguredModel(session?: Session): boolean {
    const override = session === undefined ? undefined : this.sessionOverride(session)
    const provider = override?.provider ?? this.current.provider
    const model = override?.model ?? this.current.model
    return provider.length > 0 && model.length > 0
  }

  private configuredModelLabel(session: Session): string {
    const override = this.sessionOverride(session)
    const provider = override?.provider ?? this.current.provider
    const model = override?.model ?? this.current.model
    return `${provider}/${model}`
  }

  private sessionFilePath(session: Session): string {
    return join(this.storageDir, `${session.id}.json`)
  }

  private sessionFilePathFor(id: SessionId): string {
    return join(this.storageDir, `${id}.json`)
  }

  private readSessionFile(id: SessionId): VisualAidSessionData | undefined {
    const file = this.sessionFilePathFor(id)
    if (!existsSync(file)) return undefined
    try {
      const raw = JSON.parse(readFileSync(file, 'utf8')) as {
        enabled?: { enabled: boolean; provider?: string; model?: string }
        imageRecords?: ImageRecord[]
        qas?: VisualAidQueryRecord[]
        nextImageNo?: number
        warnings?: Array<{ imageNos: number[]; message: string }>
        stats?: VisualAidStats
        operations?: VisualAidOperation[]
        currentContextTokens?: number
        currentDescribeInput?: number
        currentDescribeOutput?: number
        currentDescribeElapsedMs?: number
        currentQueryInput?: number
        currentQueryOutput?: number
        currentQueryElapsedMs?: number
      }
      return {
        ...(raw.enabled === undefined ? {} : { enabled: raw.enabled }),
        imageRecords: new Map((raw.imageRecords ?? []).map(record => [record.imageNo, record])),
        qas: raw.qas ?? [],
        nextImageNo: raw.nextImageNo ?? 1,
        warnings: raw.warnings ?? [],
        stats: raw.stats ?? emptyVisualAidStats(),
        operations: raw.operations ?? [],
        ...(raw.currentContextTokens === undefined ? {} : { currentContextTokens: raw.currentContextTokens }),
        ...(raw.currentDescribeInput === undefined ? {} : { currentDescribeInput: raw.currentDescribeInput }),
        ...(raw.currentDescribeOutput === undefined ? {} : { currentDescribeOutput: raw.currentDescribeOutput }),
        ...(raw.currentDescribeElapsedMs === undefined ? {} : { currentDescribeElapsedMs: raw.currentDescribeElapsedMs }),
        ...(raw.currentQueryInput === undefined ? {} : { currentQueryInput: raw.currentQueryInput }),
        ...(raw.currentQueryOutput === undefined ? {} : { currentQueryOutput: raw.currentQueryOutput }),
        ...(raw.currentQueryElapsedMs === undefined ? {} : { currentQueryElapsedMs: raw.currentQueryElapsedMs }),
      }
    } catch {
      // Corrupt or unreadable plugin data is treated as empty; the plugin
      // will recreate it from the live session rather than failing the host.
      return undefined
    }
  }

  private cloneSessionData(entry: VisualAidSessionData): VisualAidSessionData {
    return {
      ...(entry.enabled === undefined ? {} : { enabled: { ...entry.enabled } }),
      imageRecords: new Map([...entry.imageRecords].map(([no, record]) => [no, { ...record }])),
      qas: entry.qas.map(qa => ({ ...qa })),
      nextImageNo: entry.nextImageNo,
      warnings: entry.warnings.map(warning => ({ ...warning })),
      stats: { ...entry.stats },
      operations: entry.operations.map(operation => ({ ...operation, data: { ...operation.data } })),
      ...(entry.currentContextTokens === undefined ? {} : { currentContextTokens: entry.currentContextTokens }),
      ...(entry.currentDescribeInput === undefined ? {} : { currentDescribeInput: entry.currentDescribeInput }),
      ...(entry.currentDescribeOutput === undefined ? {} : { currentDescribeOutput: entry.currentDescribeOutput }),
      ...(entry.currentDescribeElapsedMs === undefined ? {} : { currentDescribeElapsedMs: entry.currentDescribeElapsedMs }),
      ...(entry.currentQueryInput === undefined ? {} : { currentQueryInput: entry.currentQueryInput }),
      ...(entry.currentQueryOutput === undefined ? {} : { currentQueryOutput: entry.currentQueryOutput }),
      ...(entry.currentQueryElapsedMs === undefined ? {} : { currentQueryElapsedMs: entry.currentQueryElapsedMs }),
    }
  }

  private inheritSessionData(session: Session): void {
    const parentId = session.header.parentSession
    if (parentId === undefined) return
    if (this.sessionData.has(session.id)) return
    if (existsSync(this.sessionFilePathFor(session.id))) return
    const parentEntry = this.sessionData.get(parentId) ?? this.readSessionFile(parentId)
    if (parentEntry === undefined) return
    const entry = this.cloneSessionData(parentEntry)
    this.sessionData.set(session.id, entry)
    this.saveSessionData(session)
  }

  private loadSessionData(session: Session): void {
    if (this.sessionData.has(session.id)) return
    const fromFile = this.readSessionFile(session.id)
    const entry = fromFile ?? {
      imageRecords: new Map(),
      qas: [],
      nextImageNo: 1,
      warnings: [],
      stats: emptyVisualAidStats(),
      operations: [],
    }
    this.sessionData.set(session.id, entry)
  }

  private saveSessionData(session: Session): void {
    const entry = this.sessionData.get(session.id)
    if (entry === undefined) return
    const payload = {
      ...entry.enabled === undefined ? {} : { enabled: entry.enabled },
      imageRecords: [...entry.imageRecords.values()],
      qas: entry.qas,
      nextImageNo: entry.nextImageNo,
      warnings: entry.warnings,
      stats: entry.stats,
      operations: entry.operations,
      ...(entry.currentContextTokens === undefined ? {} : { currentContextTokens: entry.currentContextTokens }),
      ...(entry.currentDescribeInput === undefined ? {} : { currentDescribeInput: entry.currentDescribeInput }),
      ...(entry.currentDescribeOutput === undefined ? {} : { currentDescribeOutput: entry.currentDescribeOutput }),
      ...(entry.currentDescribeElapsedMs === undefined ? {} : { currentDescribeElapsedMs: entry.currentDescribeElapsedMs }),
      ...(entry.currentQueryInput === undefined ? {} : { currentQueryInput: entry.currentQueryInput }),
      ...(entry.currentQueryOutput === undefined ? {} : { currentQueryOutput: entry.currentQueryOutput }),
      ...(entry.currentQueryElapsedMs === undefined ? {} : { currentQueryElapsedMs: entry.currentQueryElapsedMs }),
    }
    writeFileSync(this.sessionFilePath(session), JSON.stringify(payload, null, 2))
  }

  private removeSessionData(session: Session): void {
    this.sessionData.delete(session.id)
    const file = this.sessionFilePath(session)
    if (existsSync(file)) rmSync(file, { force: true })
  }

  private currentTurn(session: Session): number | undefined {
    let turn: number | undefined
    for (const event of session.events) {
      if (event.type === 'turn/start' || event.type === 'turn/end') turn = event.data.turn
    }
    return turn
  }

  private recordOperation(session: Session, type: VisualAidOperation['type'], data: Record<string, unknown>): void {
    const entry = this.dataFor(session)
    const operation: VisualAidOperation = { type, time: Date.now(), data }
    const turn = this.currentTurn(session)
    if (turn !== undefined) operation.turn = turn
    entry.operations.push(operation)
    this.saveSessionData(session)
  }

  private dataFor(session: Session): VisualAidSessionData {
    this.loadSessionData(session)
    const entry = this.sessionData.get(session.id)
    if (entry === undefined) throw new Error('visual-aid: session data is missing after load')
    return entry
  }

  private qasFor(session: Session): VisualQa[] {
    return this.dataFor(session).qas
      .filter(q => q.status === 'answered' && q.answer !== undefined)
      .map(q => ({ imageNos: [...q.imageNos].sort((a, b) => a - b), question: q.question, answer: q.answer as string }))
  }

  private recordsFor(session: Session): ImageRecord[] {
    const fromLog = foldImageStates(session, collectImageRecords(session))
    const stored = this.dataFor(session).imageRecords
    if (stored.size === 0) return fromLog
    const byNo = new Map(fromLog.map(record => [record.imageNo, record]))
    for (const [imageNo, record] of stored) {
      const existing = byNo.get(imageNo)
      if (existing !== undefined && existing.attachmentId === record.attachmentId) {
        byNo.set(imageNo, { ...existing, ...record })
      } else if (existing === undefined) {
        byNo.set(imageNo, record)
      }
    }
    return [...byNo.values()].sort((a, b) => a.imageNo - b.imageNo)
  }

  private messagesHaveImage(messages: readonly Message[]): boolean {
    return messages.some(message => message.content.some(block => block.type === 'image'
      || (block.type === 'tool-result' && block.content.some(inner => inner.type === 'image'))))
  }

  private project(options: GenerateOptions, next: () => AsyncIterable<StreamChunk>): AsyncIterable<StreamChunk> {
    if (this.projected.has(options)) return next()
    const session = options.sessionId === undefined ? undefined : this.ctx.sessions.get(options.sessionId)
    if (session === undefined || !this.enabledFor(session)) return next()
    return this.projectInner(options, session)
  }

  private async * projectInner(options: GenerateOptions, session: Session): AsyncGenerator<StreamChunk> {
    const target = await this.resolveTarget(session, options.signal)
    if (target === undefined) {
      if (this.hasConfiguredModel(session) && this.messagesHaveImage(options.messages)) {
        throw new Error(`visual-aid: configured vision model ${this.configuredModelLabel(session)} is unavailable or does not accept image input`)
      }
      this.projected.add(options)
      yield * this.ctx.llm.stream(options)
      return
    }
    if (options.provider === target.provider && options.model === target.model) {
      this.projected.add(options)
      yield * this.ctx.llm.stream(options)
      return
    }
    if (!this.messagesHaveImage(options.messages)) {
      this.projected.add(options)
      yield * this.ctx.llm.stream(options)
      return
    }
    this.ensureImageRecords(session)
    await this.settleDescriptions(session, target, options.signal)
    const records = this.recordsFor(session)
    if (records.length === 0) {
      this.projected.add(options)
      yield * this.ctx.llm.stream(options)
      return
    }
    const messages = substituteImages(options.messages, new Map(records.map(record => [record.imageNo, record])))
    const rebuilt = deepFreeze({ ...options, messages })
    const imageCount = options.messages.flatMap(m => m.content).filter(b => b.type === 'image').length
    const replacedCount = messages.flatMap(m => m.content).filter(b => b.type === 'text' && b.text.startsWith('[Image #')).length
    this.recordOperation(session, 'main-request', { imageCount, replacedCount, textPreview: records.map(r => r.summary ?? '').join('\n') })
    this.projected.add(rebuilt)
    yield * this.ctx.llm.stream(rebuilt)
  }

  private ensureImageRecords(session: Session): void {
    const data = this.dataFor(session)
    const fromLog = collectImageRecords(session)
    let next = data.nextImageNo
    for (const record of fromLog) {
      const existing = data.imageRecords.get(record.imageNo)
      if (existing !== undefined && existing.attachmentId === record.attachmentId) {
        // Preserve the stored status/summary; only refresh identity metadata.
        data.imageRecords.set(record.imageNo, {
          ...existing,
          imageNo: record.imageNo,
          attachmentId: record.attachmentId,
          mediaType: record.mediaType,
          bytes: record.bytes,
          width: record.width,
          height: record.height,
          ...(record.name === undefined ? {} : { name: record.name }),
        })
      } else if (!data.imageRecords.has(record.imageNo)) {
        data.imageRecords.set(record.imageNo, { ...record, status: 'pending' })
        this.recordOperation(session, 'image-added', { imageNo: record.imageNo, attachmentId: record.attachmentId, name: record.name })
      }
      next = Math.max(next, record.imageNo + 1)
    }
    data.nextImageNo = next
    this.saveSessionData(session)
  }

  private async settleDescriptions(
    session: Session,
    explicit?: { provider: string; model: string; defaultMaxTokens?: number; contextWindow?: number },
    signal?: AbortSignal,
  ): Promise<void> {
    // Closing the vision model (enabled=false) must fully stop image preprocessing.
    // provider/model are intentionally preserved in settings so the user can re-open
    // the same model quickly; that must not keep describe running in the background.
    if (!this.enabledFor(session)) return
    if (!this.current.describeImages) return
    const target = explicit ?? await this.resolveTarget(session, signal)
    if (target === undefined) return
    this.ensureImageRecords(session)
    const records = this.recordsFor(session)
    const pending = records.filter(record => record.status === 'pending')
    if (pending.length === 0) return
    const key = String(session.id)
    let slot = this.inFlight.get(key)
    if (slot === undefined) { slot = new Map(); this.inFlight.set(key, slot) }
    const attempts: Promise<void>[] = []
    for (const record of pending) {
      const held = slot.get(record.imageNo)
      if (held !== undefined) { attempts.push(held); continue }
      const attempt = this.describeOne(session, record, target, slot)
      slot.set(record.imageNo, attempt)
      attempts.push(attempt)
    }
    await Promise.allSettled(attempts)
  }

  private async describeOne(
    session: Session,
    record: ImageRecord,
    target: { provider: string; model: string; defaultMaxTokens?: number; contextWindow?: number },
    slot: Map<number, Promise<void>>,
  ): Promise<void> {
    try {
      this.recordOperation(session, 'describe-start', { imageNo: record.imageNo, attachmentId: record.attachmentId })
      const result = await this.runVisionTextWithRetry(
        target, session.id,
        [createUserMessage({ content: [{ type: 'text', text: DESCRIBE_PROMPT }, { type: 'image', attachment: { attachmentId: record.attachmentId as never, mediaType: record.mediaType as never, bytes: record.bytes, width: record.width, height: record.height, ...record.name === undefined ? {} : { name: record.name } } }], source: { kind: 'plugin', plugin: NAME } })],
        DESCRIBE_SYSTEM, this.effectiveDescribeMaxTokens(target), this.current.timeoutMs, undefined,
      )
      const data = this.dataFor(session)
      data.imageRecords.set(record.imageNo, {
        ...record,
        status: 'described',
        summary: extractCleanDescription(result.text),
        rawSummary: result.text,
        elapsedMs: result.elapsedMs,
        ...result.usage === undefined ? {} : { usage: result.usage },
      })
      data.stats.visualSteps++
      data.stats.visualElapsedMs += result.elapsedMs
      data.stats.visualInput += (result.usage?.inputTokens ?? 0) + (result.usage?.cacheReadTokens ?? 0)
      data.stats.visualOutput += result.usage?.outputTokens ?? 0
      data.stats.visualCacheRead += result.usage?.cacheReadTokens ?? 0
      data.stats.visualCacheWrite += result.usage?.cacheWriteTokens ?? 0
      data.stats.describeSteps++
      data.stats.describeInput += (result.usage?.inputTokens ?? 0) + (result.usage?.cacheReadTokens ?? 0)
      data.stats.describeOutput += result.usage?.outputTokens ?? 0
      data.stats.describeElapsedMs += result.elapsedMs
      const describeTotalInput = (result.usage?.inputTokens ?? 0) + (result.usage?.cacheReadTokens ?? 0)
      if (result.usage?.inputTokens !== undefined) data.currentDescribeInput = describeTotalInput
      if (result.usage?.outputTokens !== undefined) data.currentDescribeOutput = result.usage.outputTokens
      data.currentDescribeElapsedMs = result.elapsedMs
      this.recordOperation(session, 'describe-end', { imageNo: record.imageNo, summary: extractCleanDescription(result.text), rawSummary: result.text, elapsedMs: result.elapsedMs })
      this.saveSessionData(session)
    } catch (error) {
      this.dataFor(session).imageRecords.set(record.imageNo, { ...record, status: 'failed', failure: { message: error instanceof Error ? error.message : String(error) } })
      this.recordOperation(session, 'describe-failed', { imageNo: record.imageNo, message: error instanceof Error ? error.message : String(error) })
      this.saveSessionData(session)
    } finally { slot.delete(record.imageNo) }
  }

  private refreshTool(): void {
    for (const dispose of this.toolDisposers) dispose()
    this.toolDisposers = []
    if (!this.current.enabled || this.current.provider.length === 0 || this.current.model.length === 0) return
    this.toolDisposers.push(this.ctx.tools.register(this.viewImageDefinition()))
    this.toolDisposers.push(this.ctx.tools.register(this.visualReadImageDefinition()))
  }

  private refreshAllAgentTools(): void {
    const agents = this.ctx.get('agents')
    if (agents === undefined) return
    for (const agent of agents.list()) this.refreshAgentTools(agent)
  }

  private refreshAgentTools(agent: Agent): void {
    const previous = this.agentToolCleanups.get(agent.id)
    if (previous !== undefined) void previous()
    this.agentToolCleanups.delete(agent.id)
    const enabled = this.enabledFor(agent.session)
    if (enabled === this.current.enabled) return
    if (enabled) {
      const dispose = agent.ctx.effect(() => {
        const disposers = [
          agent.ctx.tools.register(this.viewImageDefinition()),
          agent.ctx.tools.register(this.visualReadImageDefinition()),
        ]
        return () => { for (const dispose of disposers) dispose() }
      }, 'visual-aid scoped tools')
      this.agentToolCleanups.set(agent.id, dispose)
    } else {
      const dispose = agent.ctx.effect(() => agent.ctx.tools.restrict({
        deny: ['view_image', 'visual_read_image'],
      }), 'visual-aid scoped restriction')
      this.agentToolCleanups.set(agent.id, dispose)
    }
  }

  private viewImageDefinition() {
    return defineTool({
      name: 'view_image',
      description: 'Ask the configured vision model about image #N in this session. Returns text. You may call it repeatedly with follow-up questions.',
      parameters: {
        image_ids: { type: 'array', required: true, items: { type: 'string' }, description: 'Image numbers like #1 or 1.' },
        question: { type: 'string', required: true, description: 'The exact question.' },
      },
      output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
      timeoutMs: this.current.timeoutMs,
      isConcurrencySafe: () => false,
      execute: (args, exec) => this.executeViewImage(exec, args.image_ids, args.question),
    })
  }

  private visualReadImageDefinition() {
    return defineTool({
      name: 'visual_read_image',
      description: 'Read an image file into this session through the visual-aid channel, even when the main model is text-only.',
      parameters: { file_path: { type: 'string', required: true } },
      output: {
        schema: { type: 'object', additionalProperties: false, properties: {
          path: { type: 'string', required: true },
          image: { type: 'object', additionalProperties: false, required: true, properties: {
            attachmentId: { type: 'string', required: true }, mediaType: { type: 'string', enum: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'], required: true },
            bytes: { type: 'integer', required: true }, width: { type: 'integer', required: true }, height: { type: 'integer', required: true }, name: { type: 'string' },
          } },
        } },
        render: (_args, value) => [{ type: 'text', text: `<path>${value.path}</path>\n<type>image</type>\n<content>${value.image.mediaType} image, ${value.image.width}x${value.image.height} px</content>` }, { type: 'image', attachment: { attachmentId: value.image.attachmentId as never, mediaType: value.image.mediaType, bytes: value.image.bytes, width: value.image.width, height: value.image.height, ...value.image.name === undefined ? {} : { name: value.image.name } } }],
      },
      isConcurrencySafe: () => true,
      execute: (args, exec) => this.readImage(exec, args.file_path),
    })
  }

  private async readImage(exec: ToolRunContext, filePath: string) {
    const mediaType = IMAGE_EXTENSIONS[extname(filePath).toLowerCase()]
    if (mediaType === undefined) throw new Error(`visual_read_image only accepts PNG/JPEG/WebP/GIF paths: ${filePath}`)
    const attachments = this.ctx.get('attachments')
    if (attachments === undefined) throw new Error('visual_read_image requires an attachment service')
    const fs = this.ctx.get('fs')
    if (fs === undefined) throw new Error('visual_read_image requires a filesystem service')
    const cwd = exec.agent?.session.header.cwd
    const target = await fs.resolve(filePath, { ...cwd === undefined ? {} : { cwd }, signal: exec.signal })
    const info = await fs.stat(target, exec.signal)
    if (info === undefined) throw new Error(`cannot read "${target.displayPath}": not found`)
    if (info.type !== 'file') throw new Error(`cannot read "${target.displayPath}": not a regular file`)
    const cap = Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes)
    const data = await fs.readBytes(target, exec.signal, cap)
    let ref: ImageAttachmentRef
    try {
      ref = await attachments.saveImage({ data, mediaType, name: basename(target.displayPath) })
    } catch (error) {
      if (error instanceof AttachmentError && error.code === 'IMAGE_TYPE_MISMATCH') {
        throw new Error(`cannot read "${target.displayPath}": extension declares ${mediaType}, but bytes use another format`, { cause: error })
      }
      throw error
    }
    this.ctx.emit('fs/observed', target, { kind: 'present', version: info.version }, exec)
    return {
      path: target.displayPath,
      image: {
        attachmentId: String(ref.attachmentId),
        mediaType: ref.mediaType,
        bytes: ref.bytes,
        width: ref.width,
        height: ref.height,
        ...ref.name === undefined ? {} : { name: ref.name },
      },
    }
  }

  private async executeViewImage(exec: ToolRunContext, rawIds: readonly string[], question: string): Promise<string> {
    const session = exec.agent?.session
    if (session === undefined) throw new Error('view_image requires a session tool call')
    if (!this.enabledFor(session)) throw new Error('visual-aid is disabled for this session')
    const target = await this.resolveTarget(session, exec.signal)
    if (target === undefined) {
      if (this.hasConfiguredModel(session)) throw new Error(`view_image: configured vision model ${this.configuredModelLabel(session)} is unavailable or does not accept image input`)
      throw new Error('view_image: no usable visual model is configured')
    }
    this.recordOperation(session, 'tool-invoked', { tool: 'view_image', imageNos: rawIds, question })
    this.ensureImageRecords(session)
    const records = this.recordsFor(session)
    const byNo = new Map(records.map(record => [record.imageNo, record]))
    const byAttachment = new Map(records.map(record => [record.attachmentId, record]))
    const parse = (raw: string): number => {
      const match = /^#?(\d+)$/.exec(raw.trim())
      if (match !== null && byNo.has(Number(match[1]))) return Number(match[1])
      const found = byAttachment.get(raw.trim())
      if (found !== undefined) return found.imageNo
      throw new Error(`view_image: unknown image ${JSON.stringify(raw)}`)
    }
    const imageNos = [...new Set(rawIds.map(parse))].sort((a, b) => a - b)
    const qas = this.qasFor(session)
    const contextWindow = target.contextWindow
    if (contextWindow === undefined) throw new Error('view_image: visual model declares no context window')
    const built = buildVisualRequest(records, qas, question, target, contextWindow, this.current.channelWindowRatio)
    if (built.droppedImages > 0) {
      const warning = {
        imageNos: records.slice(0, built.droppedImages).map(record => record.imageNo),
        message: `visual-aid dropped ${built.droppedImages} oldest image(s) because the channel exceeded ${Math.round(this.current.channelWindowRatio * 100)}% of the vision context window even after dropping every old QA pair`,
      }
      this.dataFor(session).warnings.push(warning)
      this.recordOperation(session, 'warning', warning)
      this.saveSessionData(session)
    }
    this.dataFor(session).qas.push({ imageNos, question, status: 'asked', route: target })
    this.dataFor(session).stats.visualSteps++
    this.recordOperation(session, 'query-asked', { imageNos, question })
    this.saveSessionData(session)
    const maxTokens = this.effectiveMaxTokens(target)
    try {
      const result = await this.runVisionTextWithRetry(
        target, session.id, built.messages, VISUAL_SYSTEM,
        maxTokens, this.current.timeoutMs, exec.signal,
      )
      const data = this.dataFor(session)
      data.qas.push({
        imageNos,
        question,
        status: 'answered',
        route: target,
        answer: result.text,
        elapsedMs: result.elapsedMs,
        ...result.usage === undefined ? {} : { usage: result.usage },
      })
      data.stats.visualAnswered++
      data.stats.visualElapsedMs += result.elapsedMs
      data.stats.visualInput += (result.usage?.inputTokens ?? 0) + (result.usage?.cacheReadTokens ?? 0)
      data.stats.visualOutput += result.usage?.outputTokens ?? 0
      data.stats.visualCacheRead += result.usage?.cacheReadTokens ?? 0
      data.stats.visualCacheWrite += result.usage?.cacheWriteTokens ?? 0
      data.stats.querySteps++
      data.stats.queryInput += (result.usage?.inputTokens ?? 0) + (result.usage?.cacheReadTokens ?? 0)
      data.stats.queryOutput += result.usage?.outputTokens ?? 0
      data.stats.queryElapsedMs += result.elapsedMs
      const queryTotalInput = (result.usage?.inputTokens ?? 0) + (result.usage?.cacheReadTokens ?? 0)
      if (result.usage?.inputTokens !== undefined) data.currentContextTokens = queryTotalInput
      if (result.usage?.inputTokens !== undefined) data.currentQueryInput = queryTotalInput
      if (result.usage?.outputTokens !== undefined) data.currentQueryOutput = result.usage.outputTokens
      data.currentQueryElapsedMs = result.elapsedMs
      this.recordOperation(session, 'query-answered', { imageNos, question, answer: result.text })
      this.saveSessionData(session)
      return result.text
    } catch (error) {
      this.dataFor(session).qas.push({ imageNos, question, status: 'failed', route: target, failure: { message: error instanceof Error ? error.message : String(error) } })
      this.recordOperation(session, 'query-failed', { imageNos, question, message: error instanceof Error ? error.message : String(error) })
      this.saveSessionData(session)
      throw error
    }
  }

  private effectiveMaxTokens(target: { defaultMaxTokens?: number }): number {
    const configured = this.current.maxTokens
    if (configured !== undefined && configured !== DEFAULT_MAX_TOKENS) return configured
    return target.defaultMaxTokens ?? DEFAULT_MAX_TOKENS
  }

  private effectiveDescribeMaxTokens(target: { defaultMaxTokens?: number }): number {
    const configured = this.current.describeMaxTokens
    if (configured !== undefined && configured > 512) return configured
    const base = target.defaultMaxTokens ?? DEFAULT_MAX_TOKENS
    return Math.max(2048, Math.floor(base / 4))
  }

  private async runVisionTextWithRetry(
    target: { provider: string; model: string },
    sessionId: SessionId,
    messages: Message[],
    system: string,
    maxTokens: number,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<{
    text: string
    usage?: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number }
    elapsedMs: number
  }> {
    let lastError: unknown
    for (let attempt = 0; attempt <= DEFAULT_MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
      try {
        return await this.runVisionText(target, sessionId, messages, system, maxTokens, timeoutMs, signal)
      } catch (error) {
        lastError = error
      }
    }
    throw lastError
  }

  private async runVisionText(
    target: { provider: string; model: string },
    sessionId: SessionId,
    messages: Message[],
    system: string,
    maxTokens: number,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<{
    text: string
    usage?: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number }
    elapsedMs: number
  }> {
    using callDeadline = deadline(signal, timeoutMs, 'VISUAL_AID_TIMEOUT')
    const started = Date.now()
    const options = deepFreeze({
      provider: target.provider,
      model: target.model,
      messages,
      system,
      maxTokens,
      sessionId,
      ...this.current.reasoningEffort === undefined ? {} : { reasoningEffort: this.current.reasoningEffort as never },
      signal: callDeadline.signal,
    })
    const assembler = new BlockAssembler()
    for await (const chunk of this.ctx.llm.stream(options)) {
      callDeadline.signal.throwIfAborted()
      assembler.push(chunk)
    }
    const finish = assembler.finish
    if (finish.kind !== 'stop') {
      const failure = finish.kind === 'error' || finish.kind === 'aborted' ? finish.failure : { message: `visual call ended with ${finish.kind}`, code: 'VISUAL_AID_FINISH' }
      throw new Error(`visual-aid failed on ${target.provider}/${target.model}: ${failure.message}`)
    }
    const text = assembler.blocks().filter(block => block.type === 'text' || block.type === 'reasoning').map(block => block.text.trim()).filter(text => text.length > 0).join('\n')
    if (text.length === 0) throw new Error(`visual-aid produced no text on ${target.provider}/${target.model}`)
    const usage = assembler.usage
    return {
      text,
      elapsedMs: Date.now() - started,
      ...usage === undefined ? {} : {
        usage: {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          ...usage.cacheReadTokens === undefined ? {} : { cacheReadTokens: usage.cacheReadTokens },
          ...usage.cacheWriteTokens === undefined ? {} : { cacheWriteTokens: usage.cacheWriteTokens },
        },
      },
    }
  }
}
