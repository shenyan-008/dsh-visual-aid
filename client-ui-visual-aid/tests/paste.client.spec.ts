// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply } from '../src/client/index.ts'

let activeCleanups: Array<() => void> = []

afterEach(() => {
  for (const cleanup of activeCleanups) cleanup()
  activeCleanups = []
})

function createFakeCtx(
  current?: string,
  options: { prompt?: (...args: unknown[]) => unknown } = {},
) {
  const cleanups: Array<() => void> = []
  const connection = {
    api: {
      sessions: {
        prompt: options.prompt ?? (async () => ({ result: { ok: true, value: { accepted: true } } })),
      },
    },
  }
  const ctx = {
    effect: (fn: () => unknown) => {
      const cleanup = fn()
      if (typeof cleanup === 'function') cleanups.push(cleanup as () => void)
      return () => {}
    },
    get: (name: string) => {
      if (name === 'connection') return connection
      return undefined
    },
    locale: {
      register: () => {},
      bind: () => () => '',
    },
    slots: {
      inject: () => {},
      register: () => () => {},
    },
    inject: () => {},
  }
  return { ctx, cleanups }
}

describe('ui-visual-aid prompt upload', () => {
  it('routes image-bearing prompts through the plugin upload route', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const originalPrompt = vi.fn(async () => ({ result: { ok: true, value: { accepted: true } } }))
    const { ctx, cleanups } = createFakeCtx('sess-1', { prompt: originalPrompt })
    apply(ctx as never)
    activeCleanups.push(...cleanups)

    const api = (ctx.get('connection') as { api: { sessions: { prompt: (...args: unknown[]) => unknown } } }).api
    const result = await api.sessions.prompt({
      sessionId: 'sess-1',
      mode: 'queue',
      content: [
        { type: 'image', mediaType: 'image/png', data: 'Zm9v', name: 'a.png' },
        { type: 'text', text: 'hello' },
      ],
    }) as { result: { ok: boolean } }

    expect(result.result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/visual-aid/upload')
    const body = JSON.parse((init as RequestInit).body as string) as { images: unknown[]; text: string }
    expect(body.images).toHaveLength(1)
    expect(body.text).toBe('hello')
    expect(originalPrompt).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('leaves non-image prompts untouched', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const originalPrompt = vi.fn(async () => ({ result: { ok: true, value: { accepted: true } } }))
    const { ctx, cleanups } = createFakeCtx('sess-1', { prompt: originalPrompt })
    apply(ctx as never)
    activeCleanups.push(...cleanups)

    const api = (ctx.get('connection') as { api: { sessions: { prompt: (...args: unknown[]) => unknown } } }).api
    const result = await api.sessions.prompt({
      sessionId: 'sess-1',
      mode: 'queue',
      content: [{ type: 'text', text: 'hello' }],
    }) as { result: { ok: boolean } }

    expect(result.result.ok).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(originalPrompt).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })
})
