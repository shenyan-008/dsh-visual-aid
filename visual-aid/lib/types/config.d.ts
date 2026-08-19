import z from '@deepseek-ai/schemastery';
export interface VisualAidConfig {
    storageDir?: string;
    enabled?: boolean;
    provider?: string;
    model?: string;
    maxTokens?: number;
    timeoutMs?: number;
    channelWindowRatio?: number;
    describeImages?: boolean;
    describeMaxTokens?: number;
    masqueradeMultimodal?: boolean;
    reasoningEffort?: string;
}
export declare const VisualAidConfigSchema: z<VisualAidConfig>;
export declare const DEFAULT_MAX_TOKENS = 4096;
export declare const DEFAULT_TIMEOUT_MS = 120000;
//# sourceMappingURL=config.d.ts.map