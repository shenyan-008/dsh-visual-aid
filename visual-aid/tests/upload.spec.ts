import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { LlmRuntime } from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import HttpServer from '@deepseek-ai/dsh-host-webserver'
import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import VisualAidService from '../src/index.ts'

let ctx: Context | undefined

afterEach(async () => {
  await ctx?.fiber.dispose()
  ctx = undefined
})

describe('visual-aid upload route', () => {
  it('accepts a pasted image and injects it into the addressed live agent', { timeout: 20_000 }, async () => {
    ctx = new Context()
    await ctx.plugin(LlmRuntime)
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(HttpServer, { host: '127.0.0.1', port: 0 })

    const sessionId = SessionId('upload-session')
    const session = ctx.sessions.create(sessionId)
    const followed: unknown[] = []
    const fakeAgent = {
      session,
      followup: (message: unknown) => { followed.push(message) },
    }
    ctx.provide('agents', {
      get: (id: SessionId) => id === sessionId ? fakeAgent : undefined,
    } as never)
    ctx.provide('attachments', {
      saveImage: async ({ data, mediaType, name }: { data: Buffer; mediaType: string; name?: string }) => ({
        attachmentId: AttachmentId(`sha256:${'a'.repeat(64)}`),
        mediaType,
        bytes: data.length,
        width: 1,
        height: 1,
        ...name === undefined ? {} : { name },
      }),
    } as never)

    await ctx.plugin(VisualAidService, { enabled: false })

    const response = await fetch(`http://127.0.0.1:${String(ctx.webServer.port)}/api/visual-aid/upload`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sessionId: String(sessionId),
        mediaType: 'image/png',
        name: 'pasted.png',
        data: Buffer.from('fake-png-bytes').toString('base64'),
      }),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(followed).toHaveLength(1)
    const message = followed[0] as { content: Array<{ type: string; attachment?: { mediaType?: string; name?: string } }> }
    expect(message.content[0]?.type).toBe('image')
    expect(message.content[0]?.attachment?.mediaType).toBe('image/png')
    expect(message.content[0]?.attachment?.name).toBe('pasted.png')
  })

  it('reads and writes the visual-aid settings namespace through the plugin route', { timeout: 20_000 }, async () => {
    ctx = new Context()
    await ctx.plugin(LlmRuntime)
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(HttpServer, { host: '127.0.0.1', port: 0 })

    let current: Record<string, unknown> = { enabled: false, provider: 'vision', model: 'vision-1' }
    const writes: Array<{ ns: string; patch: Record<string, unknown>; revision?: number }> = []
    ctx.provide('settings', {
      describe: () => [{ ns: 'visual-aid', value: current, revision: 3, schema: {} }],
      update: async (ns: string, patch: Record<string, unknown>, revision?: number) => {
        writes.push({ ns, patch, revision })
        current = { ...current, ...patch }
      },
    } as never)

    await ctx.plugin(VisualAidService, { enabled: false })

    const base = `http://127.0.0.1:${String(ctx.webServer.port)}`
    const read = await fetch(`${base}/api/visual-aid/settings`)
    expect(read.status).toBe(200)
    const readBody = await read.json() as { value: Record<string, unknown>; revision: number }
    expect(readBody.value.enabled).toBe(false)
    expect(readBody.revision).toBe(3)

    const write = await fetch(`${base}/api/visual-aid/settings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ revision: 3, patch: { enabled: true } }),
    })
    expect(write.status).toBe(200)
    const writeBody = await write.json() as { ok: boolean; value: Record<string, unknown> }
    expect(writeBody.ok).toBe(true)
    expect(writeBody.value.enabled).toBe(true)
    expect(writes).toHaveLength(1)
    expect(writes[0]!.ns).toBe('visual-aid')
    expect(writes[0]!.revision).toBeUndefined()
  })
})
