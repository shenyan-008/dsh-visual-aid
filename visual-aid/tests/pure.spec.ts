import { describe, expect, it } from 'vitest'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import type { GenerateOptions, LlmModelInfo, LlmResolvedModelInfo, StreamChunk } from '@deepseek-ai/dsh-llm'
import { createUserMessage, deepFreeze, LlmAdapter, LlmRuntime } from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import VisualAidService from '../src/index.ts'
import { createScope, scopeOf } from '../../../core/scope/src/index.ts'

const SCRIPT: StreamChunk[] = [
  { type: 'block-start', index: 0, blockType: 'text' },
  { type: 'text-delta', index: 0, text: 'a qr code' },
  { type: 'block-end', index: 0, block: { type: 'text', text: 'a qr code' } },
  { type: 'finish', reason: { kind: 'stop' } },
]

class FakeAdapter extends LlmAdapter {
  seen: GenerateOptions[] = []
  constructor(
    private readonly display: string,
    private readonly models: readonly LlmModelInfo[],
    private readonly infos: Record<string, LlmResolvedModelInfo>,
  ) {
    super()
  }

  override providerInfo(provider: string) { return { id: provider, name: this.display } }
  override listModels(_provider: string) { return Promise.resolve(this.models) }
  override resolveModel(provider: string, model: string) {
    return Promise.resolve(this.infos[model] ?? { provider, id: model, name: model })
  }
  override async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> { this.seen.push(options); yield * SCRIPT }
}

const TEXT_MODEL: LlmModelInfo = { provider: 'main', id: 'main-1', name: 'Main', inputModalities: ['text'] }
const VISION_MODEL: LlmModelInfo = { provider: 'vision', id: 'vision-1', name: 'Vision', inputModalities: ['image', 'text'] }

async function harness(enabled: boolean, contextWindow = 100_000, provider = 'vision', model = 'vision-1', masqueradeMultimodal = false) {
  const storageDir = await mkdtemp(join(tmpdir(), 'dsh-va-test-'))
  const ctx = new Context()
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  const main = new FakeAdapter('Main', [TEXT_MODEL], { 'main-1': { provider: 'main', id: 'main-1', name: 'Main', inputModalities: ['text'] } })
  const vision = new FakeAdapter('Vision', [VISION_MODEL], {
    'vision-1': { provider: 'vision', id: 'vision-1', name: 'Vision', inputModalities: ['image', 'text'], defaultMaxTokens: 64, context: { contextWindow } },
    'vision-text': { provider: 'vision', id: 'vision-text', name: 'Vision Text', inputModalities: ['text'] },
  })
  ctx.llm.registerAdapter(['main'], main)
  ctx.llm.registerAdapter(['vision'], vision)
  const session = ctx.sessions.create(SessionId('pure'))
  await ctx.plugin(VisualAidService, { enabled, provider, model, storageDir, masqueradeMultimodal })
  return { ctx, main, vision, session }
}

async function mintToolsScope(ctx: Context, key: object) {
  let scope!: ReturnType<typeof createScope>
  await ctx.plugin(Object.assign((inner: Context) => { scope = createScope(inner, key) }, { inject: ['tools'] }))
  return scope
}

function image(name = 'shot.png', width = 64, height = 64) {
  const digest = Buffer.from(name).toString('hex').padEnd(64, '0').slice(0, 64)
  return createUserMessage({
    content: [{ type: 'image' as const, attachment: { attachmentId: AttachmentId(`sha256:${digest}`), mediaType: 'image/png' as const, bytes: 10, width, height, name } }],
    source: { kind: 'user' },
  })
}

async function streamMain(ctx: Context, session: ReturnType<SessionStore['create']>) {
  const request = deepFreeze({ provider: 'main', model: 'main-1', messages: session.deriveMessages(), system: 'sys', sessionId: session.id })
  const chunks: StreamChunk[] = []
  for await (const chunk of ctx.llm.stream(request)) chunks.push(chunk)
  return chunks
}

describe('pure visual-aid plugin', () => {
  it('is inert while disabled', async () => {
    const h = await harness(false)
    h.session.append('user/message', image(), { surfaceOp: 'append' })
    await streamMain(h.ctx, h.session)
    expect(h.ctx.tools.get('view_image', undefined)).toBeUndefined()
    expect(h.main.seen[0]!.messages.some(m => m.content.some(b => b.type === 'image'))).toBe(true)
    expect(h.vision.seen.length).toBe(0)
  })

  it('does not auto-describe images after the vision model is closed', async () => {
    // Mirrors the UI "关闭" action: enabled=false while provider/model stay configured.
    const h = await harness(false)
    h.session.append('user/message', image('closed.png'), { surfaceOp: 'append' })
    // Allow the session/event async describe path a chance to race if it were still live.
    await new Promise(resolve => setTimeout(resolve, 50))
    await streamMain(h.ctx, h.session)
    expect(h.vision.seen.length).toBe(0)
    const service = h.ctx.visualAid as unknown as {
      settleDescriptions(session: typeof h.session): Promise<void>
    }
    await service.settleDescriptions(h.session)
    expect(h.vision.seen.length).toBe(0)
  })

  it('treats enabled without a configured model as disabled', async () => {
    const h = await harness(true, 100_000, '', '')
    h.session.append('user/message', image(), { surfaceOp: 'append' })
    await streamMain(h.ctx, h.session)
    expect(h.ctx.tools.get('view_image', undefined)).toBeUndefined()
    expect(h.main.seen[0]!.messages.some(m => m.content.some(b => b.type === 'image'))).toBe(true)
  })

  it('fails loudly when the selected model cannot accept images', async () => {
    const h = await harness(true, 100_000, 'vision', 'vision-text')
    h.session.append('user/message', image(), { surfaceOp: 'append' })
    await expect(streamMain(h.ctx, h.session)).rejects.toThrow(/does not accept image input/)
  })

  it('does not break text-only requests when the selected model cannot accept images', async () => {
    const h = await harness(true, 100_000, 'vision', 'vision-text')
    await streamMain(h.ctx, h.session)
    expect(h.main.seen.length).toBe(1)
  })

  it('short-circuits the main request and substitutes image placeholders', async () => {
    const h = await harness(true)
    h.session.append('user/message', image(), { surfaceOp: 'append' })
    await streamMain(h.ctx, h.session)
    expect(h.vision.seen.length).toBe(1)
    expect(h.main.seen.length).toBe(1)
    expect(h.main.seen[0]!.messages.some(m => m.content.some(b => b.type === 'image'))).toBe(false)
    expect(h.main.seen[0]!.messages.some(m => m.content.some(b => b.type === 'text' && b.text.includes('[Image #1: shot.png, 64×64')))).toBe(true)
    expect(h.session.events.some(e => e.type === 'visual-aid/image')).toBe(false)
  })

  it('registers the vision tools and answers view_image through the vision route', async () => {
    const h = await harness(true)
    h.session.append('user/message', image(), { surfaceOp: 'append' })
    const tool = h.ctx.tools.get('view_image', undefined)!
    expect(tool).toBeDefined()
    expect(h.ctx.tools.get('visual_read_image', undefined)).toBeDefined()
    const answer = await tool.execute({ image_ids: ['#1'], question: 'what is this?' }, { agent: { session: h.session }, signal: new AbortController().signal } as never)
    expect(answer).toBe('a qr code')
    expect(h.session.events.some(e => e.type === 'visual-aid/query')).toBe(false)
  })

  it('does not pre-convert images for image-free child sessions', async () => {
    const h = await harness(true)
    const child = h.ctx.sessions.create(SessionId('child'))
    await streamMain(h.ctx, child)
    expect(h.vision.seen.length).toBe(0)
    expect(h.main.seen.length).toBe(1)
  })

  it('applies the same projection on demand to child sessions that carry images', async () => {
    const h = await harness(true)
    const child = h.ctx.sessions.create(SessionId('child'))
    child.append('user/message', image('child.png'), { surfaceOp: 'append' })
    await streamMain(h.ctx, child)
    expect(h.vision.seen.length).toBe(1)
    expect(h.main.seen[0]!.messages.some(m => m.content.some(b => b.type === 'image'))).toBe(false)
    expect(h.main.seen[0]!.messages.some(m => m.content.some(b => b.type === 'text' && b.text.includes('[Image #1: child.png')))).toBe(true)
  })

  it('does not write a durable drop-warning when trimming must drop an image', async () => {
    const h = await harness(true, 900)
    h.session.append('user/message', image('a.png', 700, 700), { surfaceOp: 'append' })
    h.session.append('user/message', image('b.png', 700, 700), { surfaceOp: 'append' })
    const tool = h.ctx.tools.get('view_image', undefined)!
    await tool.execute({ image_ids: ['#1'], question: 'what is this?' }, { agent: { session: h.session }, signal: new AbortController().signal } as never)
    const warning = h.session.events.find(e => e.type === 'visual-aid/drop-warning')
    expect(warning).toBeUndefined()
  })

  it('does not register scoped vision tools for a session override while global is off', async () => {
    const h = await harness(false)
    const scope = await mintToolsScope(h.ctx, {})
    const session = h.ctx.sessions.create(SessionId('scoped-on'))
    session.append('visual-aid/toggle', { enabled: true })
    const service = h.ctx.visualAid as unknown as { refreshAgentTools(agent: { id: SessionId; session: ReturnType<SessionStore['create']>; ctx: Context }): void }
    service.refreshAgentTools({ id: session.id, session, ctx: scope.ctx })
    const key = scopeOf(scope.ctx)
    expect(h.ctx.tools.get('view_image', key)).toBeUndefined()
    expect(h.ctx.tools.get('visual_read_image', key)).toBeUndefined()
    await scope.dispose()
  })

  it('keeps global vision tools for a session even when an old session override says off', async () => {
    const h = await harness(true)
    const scope = await mintToolsScope(h.ctx, {})
    const session = h.ctx.sessions.create(SessionId('scoped-off'))
    session.append('visual-aid/toggle', { enabled: false })
    const service = h.ctx.visualAid as unknown as { refreshAgentTools(agent: { id: SessionId; session: ReturnType<SessionStore['create']>; ctx: Context }): void }
    service.refreshAgentTools({ id: session.id, session, ctx: scope.ctx })
    const key = scopeOf(scope.ctx)
    expect(h.ctx.tools.get('view_image', key)).toBeDefined()
    expect(h.ctx.tools.get('visual_read_image', key)).toBeDefined()
    await scope.dispose()
  })

  it('inherits already-described image records when forking a session', async () => {
    const h = await harness(true)
    h.session.append('user/message', image('fork.png'), { surfaceOp: 'append' })
    await streamMain(h.ctx, h.session)
    expect(h.vision.seen.length).toBe(1)

    const child = h.ctx.sessions.fork(h.session)
    const visionCallsBefore = h.vision.seen.length
    await streamMain(h.ctx, child)

    // The child must reuse the parent description instead of calling the vision model again.
    expect(h.vision.seen.length).toBe(visionCallsBefore)
    const lastMain = h.main.seen.at(-1)!
    expect(lastMain.messages.some(m => m.content.some(b => b.type === 'image'))).toBe(false)
    expect(lastMain.messages.some(m => m.content.some(b => b.type === 'text' && b.text.includes('[Image #1: fork.png')))).toBe(true)
  })

  it('masquerades text-only main models as image-capable when enabled', async () => {
    const h = await harness(true, 100_000, 'vision', 'vision-1', true)
    const info = await h.ctx.llm.resolveModelInfo('main', 'main-1')
    expect(info.inputModalities).toContain('image')
  })

  it('does not masquerade text-only main models when disabled', async () => {
    const h = await harness(true, 100_000, 'vision', 'vision-1', false)
    const info = await h.ctx.llm.resolveModelInfo('main', 'main-1')
    expect(info.inputModalities).not.toContain('image')
  })

  it('does not masquerade the configured vision model itself', async () => {
    const h = await harness(true, 100_000, 'vision', 'vision-1', true)
    const info = await h.ctx.llm.resolveModelInfo('vision', 'vision-1')
    expect(info.inputModalities).toContain('image')
  })
})
