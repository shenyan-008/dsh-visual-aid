import type { ContentBlock, Message } from '@deepseek-ai/dsh-llm';
import type { Session } from '@deepseek-ai/dsh-session';
export interface ImageRecord {
    imageNo: number;
    attachmentId: string;
    mediaType: string;
    bytes: number;
    width: number;
    height: number;
    name?: string;
    status: 'pending' | 'described' | 'failed';
    summary?: string;
    rawSummary?: string;
    failure?: {
        message: string;
        code?: string;
    };
    elapsedMs?: number;
    usage?: {
        inputTokens: number;
        outputTokens: number;
        cacheReadTokens?: number;
        cacheWriteTokens?: number;
    };
}
export interface VisualQa {
    imageNos: number[];
    question: string;
    answer: string;
}
declare module '@deepseek-ai/dsh-session/types' {
    interface SessionEventMap {
        'visual-aid/image': ImageRecord;
        'visual-aid/query': {
            imageNos: number[];
            question: string;
            status: 'asked' | 'answered' | 'failed';
            route: {
                provider: string;
                model: string;
            };
            answer?: string;
            failure?: {
                message: string;
                code?: string;
            };
            usage?: {
                inputTokens: number;
                outputTokens: number;
                cacheReadTokens?: number;
                cacheWriteTokens?: number;
            };
            elapsedMs?: number;
        };
        'visual-aid/toggle': {
            enabled: boolean;
            provider?: string;
            model?: string;
        };
        'visual-aid/counter': {
            next: number;
        };
        'visual-aid/drop-warning': {
            imageNos: number[];
            message: string;
        };
    }
}
export declare function collectImageRecords(session: Session): ImageRecord[];
export declare function foldImageStates(session: Session, records: ImageRecord[]): ImageRecord[];
export declare function collectVisualQas(session: Session): VisualQa[];
export declare function placeholderText(record: ImageRecord): string;
export declare function substituteImages(messages: readonly Message[], images: ReadonlyMap<number, ImageRecord>): Message[];
export declare function imageBlockFor(record: ImageRecord): ContentBlock;
export declare function estimateTextTokens(text: string): number;
export declare function estimateImageTokens(record: ImageRecord): number;
export declare const VISUAL_SYSTEM = "You are the visual channel. Answer only the latest question about the images. You may build on earlier answers but do not repeat them. Follow the language of the question.";
export declare const DESCRIBE_SYSTEM = "Describe the attached image in concise English. Transcribe visible text exactly.";
export declare const DESCRIBE_PROMPT = "Describe this image in concise English. State what it shows and transcribe all visible text exactly. Output ONLY the final description after the line \"FINAL_DESCRIPTION:\". Do not include any thinking, planning, or reasoning before that line.";
export declare function buildVisualRequest(records: readonly ImageRecord[], qas: readonly VisualQa[], question: string, route: {
    provider: string;
    model: string;
}, contextWindow: number, ratio: number): {
    messages: Message[];
    droppedQas: number;
    droppedImages: number;
};
//# sourceMappingURL=channel.d.ts.map