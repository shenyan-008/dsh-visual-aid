export const VISUAL_AID_NS = 'visual-aid';
const SETTINGS_ENDPOINT = '/api/visual-aid/settings';
async function errorFrom(response, fallback) {
    let message = fallback;
    try {
        const data = await response.json();
        if (typeof data.error === 'string' && data.error.length > 0)
            message = data.error;
    }
    catch {
        // keep fallback
    }
    return new Error(message);
}
export async function loadSettings(_api) {
    const response = await fetch(SETTINGS_ENDPOINT);
    if (!response.ok)
        throw await errorFrom(response, `failed to load visual-aid settings (${response.status})`);
    const data = await response.json();
    return { ...(data.value ?? {}), revision: data.revision ?? 0 };
}
export async function saveSettings(_api, revision, patch) {
    const response = await fetch(SETTINGS_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ revision, patch }),
    });
    if (!response.ok)
        throw await errorFrom(response, `failed to save visual-aid settings (${response.status})`);
}
export async function loadAllModels(api) {
    const response = await api.llm.models({});
    if (!response.result.ok)
        return [];
    return response.result.value.groups.flatMap(group => group.models.map(model => ({
        provider: group.id,
        providerName: group.name,
        model: model.id,
        modelName: model.name,
        ...(() => {
            const maybe = model;
            return Array.isArray(maybe.inputModalities)
                ? { inputModalities: maybe.inputModalities }
                : {};
        })(),
    })));
}
export async function loadSessionData(sessionId) {
    const response = await fetch(`/api/visual-aid/session?sessionId=${encodeURIComponent(sessionId)}`);
    if (!response.ok)
        throw await errorFrom(response, `failed to load visual-aid session data (${response.status})`);
    return await response.json();
}
export async function loadModelInfo(provider, model) {
    const response = await fetch(`/api/visual-aid/model-info?provider=${encodeURIComponent(provider)}&model=${encodeURIComponent(model)}`);
    if (!response.ok)
        return {};
    return await response.json();
}
//# sourceMappingURL=store.js.map