import type { IApiClient } from '@deepseek-ai/dsh-api-remotes/client';
export declare const VISUAL_AID_NS = "visual-aid";
export interface ModelOption {
    provider: string;
    providerName: string;
    model: string;
    modelName: string;
    maxTokens?: number;
    contextWindow?: number;
    inputModalities?: string[];
}
export declare function loadSettings(_api: IApiClient): Promise<Record<string, unknown>>;
export declare function saveSettings(_api: IApiClient, revision: number, patch: Record<string, unknown>): Promise<void>;
export declare function loadAllModels(api: IApiClient): Promise<ModelOption[]>;
export interface VisualAidSessionData {
    enabled: boolean;
    provider?: string;
    model?: string;
    imageRecords: Array<{
        imageNo: number;
        attachmentId: string;
        mediaType: string;
        bytes: number;
        width: number;
        height: number;
        name?: string;
        status: string;
        summary?: string;
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
    }>;
    qas: Array<{
        imageNos: number[];
        question: string;
        status: string;
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
    }>;
    nextImageNo: number;
    warnings: Array<{
        imageNos: number[];
        message: string;
    }>;
    stats: {
        visualSteps: number;
        visualAnswered: number;
        visualInput: number;
        visualOutput: number;
        visualCacheRead: number;
        visualCacheWrite: number;
        visualElapsedMs: number;
        visualToolMs: number;
        describeSteps: number;
        describeInput: number;
        describeOutput: number;
        describeElapsedMs: number;
        querySteps: number;
        queryInput: number;
        queryOutput: number;
        queryElapsedMs: number;
    };
    currentContextTokens?: number;
    currentDescribeInput?: number;
    currentDescribeOutput?: number;
    currentDescribeElapsedMs?: number;
    currentQueryInput?: number;
    currentQueryOutput?: number;
    currentQueryElapsedMs?: number;
    operations: Array<{
        type: string;
        time: number;
        turn?: number;
        data: Record<string, unknown>;
    }>;
}
export declare function loadSessionData(sessionId: string): Promise<VisualAidSessionData>;
export interface ModelInfo {
    maxTokens?: number;
    contextWindow?: number;
    reasoning?: {
        efforts: Array<{
            id: string;
            name: string;
            description?: string;
        }>;
        defaultEffort?: string;
    };
}
export declare function loadModelInfo(provider: string, model: string): Promise<ModelInfo>;
//# sourceMappingURL=store.d.ts.map