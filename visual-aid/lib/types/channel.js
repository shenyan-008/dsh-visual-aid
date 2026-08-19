import { createUserMessage, createAssistantMessage, deepFreeze } from '@deepseek-ai/dsh-llm';
import { AttachmentId } from '@deepseek-ai/dsh-attachment';
function surfaceContent(event) {
    switch (event.type) {
        case 'user/message': return event.data.content;
        case 'assistant/message': return event.data.message.content;
        case 'tool/result': return event.data.message.content;
        default: return undefined;
    }
}
function visitImages(blocks, visit) {
    for (const block of blocks) {
        if (block.type === 'image')
            visit(block.attachment);
        else if (block.type === 'tool-result')
            visitImages(block.content, visit);
    }
}
export function collectImageRecords(session) {
    const byAttachment = new Map();
    const present = new Set();
    let next = 1;
    for (const event of session.events) {
        if (event.type === 'visual-aid/counter' && typeof event.data.next === 'number') {
            next = Math.max(next, event.data.next);
        }
    }
    for (const event of session.events) {
        const content = surfaceContent(event);
        if (content === undefined)
            continue;
        visitImages(content, (attachment) => { present.add(String(attachment.attachmentId)); });
    }
    // Existing durable records win when the image is still present in the
    // current transcript; they preserve numbering across replay and compaction.
    for (const event of session.events) {
        if (event.type !== 'visual-aid/image')
            continue;
        const record = event.data;
        if (!present.has(record.attachmentId))
            continue;
        byAttachment.set(record.attachmentId, { ...record });
        next = Math.max(next, record.imageNo + 1);
    }
    for (const event of session.events) {
        const content = surfaceContent(event);
        if (content === undefined)
            continue;
        visitImages(content, (attachment) => {
            const id = String(attachment.attachmentId);
            if (byAttachment.has(id))
                return;
            byAttachment.set(id, {
                imageNo: next++,
                attachmentId: id,
                mediaType: attachment.mediaType,
                bytes: attachment.bytes,
                width: attachment.width,
                height: attachment.height,
                ...attachment.name === undefined ? {} : { name: attachment.name },
                status: 'pending',
            });
        });
    }
    return [...byAttachment.values()].sort((a, b) => a.imageNo - b.imageNo);
}
export function foldImageStates(session, records) {
    const byNo = new Map(records.map(record => [record.imageNo, record]));
    for (const event of session.events) {
        if (event.type !== 'visual-aid/image')
            continue;
        const existing = byNo.get(event.data.imageNo);
        if (existing === undefined || existing.attachmentId !== event.data.attachmentId)
            continue;
        byNo.set(event.data.imageNo, { ...existing, ...event.data });
    }
    return [...byNo.values()].sort((a, b) => a.imageNo - b.imageNo);
}
export function collectVisualQas(session) {
    const qas = [];
    for (const event of session.events) {
        if (event.type !== 'visual-aid/query' || event.data.status !== 'answered')
            continue;
        if (event.data.answer === undefined)
            continue;
        qas.push({ imageNos: [...event.data.imageNos].sort((a, b) => a - b), question: event.data.question, answer: event.data.answer });
    }
    return qas;
}
export function placeholderText(record) {
    const label = record.name ?? 'image';
    const detail = record.status === 'described' && record.summary !== undefined ? record.summary : 'no description yet';
    return `[Image #${record.imageNo}: ${label}, ${record.width}\u00d7${record.height} \u2014 ${detail}. Use this description as the source of truth; only query with view_image(#${record.imageNo}, question) if a needed detail is missing]`;
}
export function substituteImages(messages, images) {
    const byAttachment = new Map([...images.values()].map(record => [record.attachmentId, record]));
    const substitute = (blocks) => blocks.map((block) => {
        if (block.type === 'image') {
            const record = byAttachment.get(String(block.attachment.attachmentId));
            return { type: 'text', text: record === undefined ? '[Image unavailable]' : placeholderText(record) };
        }
        if (block.type === 'tool-result')
            return { ...block, content: substitute(block.content) };
        return block;
    });
    return messages.map((message) => {
        const hasImage = message.content.some(block => block.type === 'image'
            || (block.type === 'tool-result' && block.content.some(inner => inner.type === 'image')));
        if (!hasImage)
            return message;
        return deepFreeze({ ...message, content: substitute(message.content) });
    });
}
export function imageBlockFor(record) {
    return {
        type: 'image',
        attachment: {
            attachmentId: AttachmentId(record.attachmentId),
            mediaType: record.mediaType,
            bytes: record.bytes,
            width: record.width,
            height: record.height,
            ...record.name === undefined ? {} : { name: record.name },
        },
    };
}
export function estimateTextTokens(text) { return Math.ceil(text.length / 4) + 4; }
export function estimateImageTokens(record) { return Math.max(16, Math.ceil(record.width * record.height / 750)); }
export const VISUAL_SYSTEM = 'You are the visual channel. Answer only the latest question about the images. You may build on earlier answers but do not repeat them. Follow the language of the question.';
export const DESCRIBE_SYSTEM = 'Describe the attached image in concise English. Transcribe visible text exactly.';
export const DESCRIBE_PROMPT = 'Describe this image in concise English. State what it shows and transcribe all visible text exactly. Output ONLY the final description after the line "FINAL_DESCRIPTION:". Do not include any thinking, planning, or reasoning before that line.';
export function buildVisualRequest(records, qas, question, route, contextWindow, ratio) {
    const sorted = [...records].sort((a, b) => a.imageNo - b.imageNo);
    if (sorted.length === 0)
        throw new Error('visual-aid: view_image needs at least one image in this session');
    let droppedImages = 0;
    const toMessage = (text, role) => role === 'user'
        ? createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'plugin', plugin: 'dsh-visual-aid' } })
        : createAssistantMessage({ content: [{ type: 'text', text }], source: { provider: route.provider, model: route.model } });
    const imageTokens = () => sorted.reduce((sum, record) => sum + estimateImageTokens(record), 0);
    const total = (history) => estimateTextTokens(VISUAL_SYSTEM) + 4
        + imageTokens()
        + history.reduce((sum, qa) => sum + estimateTextTokens(qa.question) + estimateTextTokens(qa.answer), 0);
    let dropped = 0;
    let history = qas;
    const limit = Math.max(1, Math.floor(contextWindow * ratio));
    while (history.length > 0 && total(history) > limit) {
        history = history.slice(1);
        dropped++;
    }
    // QA exhausted: only now may the oldest images be dropped, and the caller
    // must surface a user-visible warning before the next request.
    while (sorted.length > 1 && total(history) > limit) {
        sorted.shift();
        droppedImages++;
    }
    if (total(history) > limit) {
        throw new Error(`visual-aid: even one image exceeds ${Math.round(ratio * 100)}% of the visual model context window; use a smaller image`);
    }
    const imageMessage = createUserMessage({ content: sorted.map(imageBlockFor), source: { kind: 'plugin', plugin: 'dsh-visual-aid' } });
    return {
        messages: deepFreeze([imageMessage, ...history.flatMap(qa => [toMessage(qa.question, 'user'), toMessage(qa.answer, 'assistant')]), toMessage(question, 'user')]),
        droppedQas: dropped,
        droppedImages,
    };
}
//# sourceMappingURL=channel.js.map