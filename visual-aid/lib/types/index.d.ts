import { Context, Service } from '@deepseek-ai/cordis';
import type { Session } from '@deepseek-ai/dsh-session';
import z from '@deepseek-ai/schemastery';
import { type VisualAidConfig } from './config.ts';
export declare const NAME = "@deepseek-ai/dsh-visual-aid";
declare module '@deepseek-ai/cordis' {
    interface Context {
        visualAid: VisualAidService;
    }
}
export default class VisualAidService extends Service {
    static Config: z<VisualAidConfig>;
    static inject: string[];
    private current;
    private targetCache;
    private toolDisposers;
    private agentToolCleanups;
    private sessionData;
    private storageDir;
    private inFlight;
    private projected;
    constructor(ctx: Context, config: VisualAidConfig);
    private patchResolveModelInfo;
    private applyConfig;
    private invalidateTarget;
    private resolveTarget;
    sessionOverride(session: Session): {
        enabled: boolean;
        provider?: string;
        model?: string;
    } | undefined;
    enabledFor(session?: Session): boolean;
    private hasConfiguredModel;
    private configuredModelLabel;
    private sessionFilePath;
    private sessionFilePathFor;
    private readSessionFile;
    private cloneSessionData;
    private inheritSessionData;
    private loadSessionData;
    private saveSessionData;
    private removeSessionData;
    private currentTurn;
    private recordOperation;
    private dataFor;
    private qasFor;
    private recordsFor;
    private messagesHaveImage;
    private project;
    private projectInner;
    private ensureImageRecords;
    private settleDescriptions;
    private describeOne;
    private refreshTool;
    private refreshAllAgentTools;
    private refreshAgentTools;
    private viewImageDefinition;
    private visualReadImageDefinition;
    private readImage;
    private executeViewImage;
    private effectiveMaxTokens;
    private effectiveDescribeMaxTokens;
    private runVisionTextWithRetry;
    private runVisionText;
}
//# sourceMappingURL=index.d.ts.map