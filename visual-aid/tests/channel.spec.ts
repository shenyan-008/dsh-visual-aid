import { describe, expect, it } from 'vitest'
import { buildVisualRequest, collectImageRecords, foldImageStates, placeholderText } from '../src/channel.ts'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import type { ImageRecord } from '../src/channel.ts'

const record = (imageNo: number, width = 64, height = 64): ImageRecord => ({
  imageNo,
  attachmentId: `sha256:${String(imageNo).padStart(64, 'a')}`,
  mediaType: 'image/png',
  bytes: 10,
  width,
  height,
  name: `img${imageNo}.png`,
  status: 'pending',
})

describe('channel trim rules', () => {
  it('drops QA pairs first and keeps every image', () => {
    const qas = Array.from({ length: 30 }, (_, i) => ({ imageNos: [1], question: `q${i}?`, answer: `a${i}` }))
    const built = buildVisualRequest([record(1)], qas, 'latest?', { provider: 'vision', model: 'v1' }, 300, 0.85)
    expect(built.droppedQas).toBeGreaterThan(0)
    expect(built.droppedImages).toBe(0)
    expect(built.messages[0]!.content).toHaveLength(1)
  })

  it('drops oldest images only after every QA pair is gone, then reports the warning set', () => {
    const qas = Array.from({ length: 10 }, (_, i) => ({ imageNos: [i + 1], question: `q${i}?`, answer: `a${i}` }))
    const images = [record(1, 800, 800), record(2, 800, 800)]
    const built = buildVisualRequest(images, qas, 'latest?', { provider: 'vision', model: 'v1' }, 1200, 0.85)
    expect(built.droppedQas).toBe(10)
    expect(built.droppedImages).toBeGreaterThan(0)
    expect(built.messages[0]!.content.length).toBeLessThan(2)
  })

  it('keeps numbered placeholders deterministic across replay seeds', () => {
    const session = Session.create(SessionId('replay'))
    session.append('user/message', createUserMessage({
      content: [{ type: 'image', attachment: { attachmentId: AttachmentId(record(1).attachmentId), mediaType: 'image/png' as const, bytes: 10, width: 64, height: 64, name: 'img1.png' } }],
      source: { kind: 'user' },
    }), { surfaceOp: 'append' })
    session.append('visual-aid/image', { ...record(1), status: 'described', summary: 'a qr code' })
    const replayed = Session.create(session.id, session.events, session.header)
    const folded = foldImageStates(replayed, collectImageRecords(replayed))
    expect(placeholderText(folded[0]!)).toContain('[Image #1: img1.png, 64×64 — a qr code.')
  })

  it('does not reuse image numbers after compaction', () => {
    const session = Session.create(SessionId('compact'))
    session.append('user/message', createUserMessage({
      content: [{ type: 'image', attachment: { attachmentId: AttachmentId(record(1).attachmentId), mediaType: 'image/png' as const, bytes: 10, width: 64, height: 64, name: 'img1.png' } }],
      source: { kind: 'user' },
    }), { surfaceOp: 'append' })
    session.append('visual-aid/counter', { next: 2 })

    // A compaction drops old transcript rows but keeps the monotonic counter.
    const compacted = Session.create(SessionId('compact'))
    compacted.append('visual-aid/counter', { next: 2 })
    compacted.append('user/message', createUserMessage({
      content: [{ type: 'image', attachment: { attachmentId: AttachmentId(record(2).attachmentId), mediaType: 'image/png' as const, bytes: 10, width: 64, height: 64, name: 'img2.png' } }],
      source: { kind: 'user' },
    }), { surfaceOp: 'append' })

    const records = collectImageRecords(compacted)
    expect(records.map(item => item.imageNo)).toEqual([2])
  })
})
