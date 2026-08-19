import type { ConnectionHandle } from '@deepseek-ai/dsh-api-remotes/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { en, NS, zh, type VisualAidKey } from './locales.ts'
import { VisualAidSection, VisualAidToggle, VisualView } from './components.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'settings.visualAid': VisualAidKey }
}

export const inject = ['connection', 'locale', 'slots']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-visual-aid: dictionaries')
  const api = (ctx.get('connection') as ConnectionHandle).api

  // Intercept every image-bearing prompt and send it through the plugin-owned
  // upload route. The official prompt API rejects images before the plugin can
  // convert them when the main model is text-only, so this wrapper is required
  // for file-picker and drag-drop paths, not just Ctrl+V paste.
  const originalPrompt = api.sessions.prompt.bind(api.sessions)
  api.sessions.prompt = (async (request: Parameters<typeof originalPrompt>[0]) => {
    const payload = request as {
      sessionId: string
      mode: string
      content: Array<{ type: string; text?: string; mediaType?: string; data?: string; name?: string }>
    }
    const content = payload.content
    if (!content.some(part => part.type === 'image')) {
      return originalPrompt(request)
    }
    const images = content
      .filter((part): part is { type: 'image'; mediaType: string; data: string; name?: string } =>
        part.type === 'image' && typeof part.mediaType === 'string' && typeof part.data === 'string')
      .map(part => ({ mediaType: part.mediaType, data: part.data, ...(part.name === undefined ? {} : { name: part.name }) }))
    const text = content.filter(part => part.type === 'text').map(part => part.text ?? '').join('')
    const response = await fetch('/api/visual-aid/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: payload.sessionId, images, text }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { error?: string }
      return { result: { ok: false as const, error: { code: 'attachment-error', message: data.error ?? 'visual-aid upload failed', details: {} } } } as never
    }
    return { result: { ok: true as const, value: { accepted: true as const } } } as never
  })

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'visual-aid',
    order: 25,
    label: () => ctx.locale.bind(NS)('nav'),
    locale: NS,
    inject: () => ({ api }),
  }, VisualAidSection))

  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'visual',
    order: 20,
    locale: NS,
    label: () => ctx.locale.bind(NS)('viewVisual'),
    inject: () => ({ api }),
  }, VisualView))

  ctx.inject(['slots', 'sessions'], (scope: ClientContext) => {
    scope.effect(() => {
      const toggle = scope.slots.register({
        name: 'conversation.input.left',
        id: 'visual-aid-toggle',
        order: 30,
        label: () => scope.locale.bind(NS)('headerOn'),
        locale: NS,
        inject: () => ({ api }),
      }, VisualAidToggle)
      return () => { toggle() }
    }, 'ui-visual-aid: input bar actions')
  })
}
