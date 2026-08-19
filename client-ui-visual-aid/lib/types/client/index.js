import { en, NS, zh } from "./locales.js";
import { VisualAidSection, VisualAidToggle, VisualView } from "./components.js";
export const inject = ['connection', 'locale', 'slots'];
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-visual-aid: dictionaries');
    const api = ctx.get('connection').api;
    // Intercept every image-bearing prompt and send it through the plugin-owned
    // upload route. The official prompt API rejects images before the plugin can
    // convert them when the main model is text-only, so this wrapper is required
    // for file-picker and drag-drop paths, not just Ctrl+V paste.
    const originalPrompt = api.sessions.prompt.bind(api.sessions);
    api.sessions.prompt = (async (request) => {
        const payload = request;
        const content = payload.content;
        if (!content.some(part => part.type === 'image')) {
            return originalPrompt(request);
        }
        const images = content
            .filter((part) => part.type === 'image' && typeof part.mediaType === 'string' && typeof part.data === 'string')
            .map(part => ({ mediaType: part.mediaType, data: part.data, ...(part.name === undefined ? {} : { name: part.name }) }));
        const text = content.filter(part => part.type === 'text').map(part => part.text ?? '').join('');
        const response = await fetch('/api/visual-aid/upload', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sessionId: payload.sessionId, images, text }),
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            return { result: { ok: false, error: { code: 'attachment-error', message: data.error ?? 'visual-aid upload failed', details: {} } } };
        }
        return { result: { ok: true, value: { accepted: true } } };
    });
    ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'visual-aid',
        order: 25,
        label: () => ctx.locale.bind(NS)('nav'),
        locale: NS,
        inject: () => ({ api }),
    }, VisualAidSection));
    ctx.slots.inject('conversation.view', () => ctx.slots.register({
        name: 'conversation.view',
        id: 'visual',
        order: 20,
        locale: NS,
        label: () => ctx.locale.bind(NS)('viewVisual'),
        inject: () => ({ api }),
    }, VisualView));
    ctx.inject(['slots', 'sessions'], (scope) => {
        scope.effect(() => {
            const toggle = scope.slots.register({
                name: 'conversation.input.left',
                id: 'visual-aid-toggle',
                order: 30,
                label: () => scope.locale.bind(NS)('headerOn'),
                locale: NS,
                inject: () => ({ api }),
            }, VisualAidToggle);
            return () => { toggle(); };
        }, 'ui-visual-aid: input bar actions');
    });
}
//# sourceMappingURL=index.js.map