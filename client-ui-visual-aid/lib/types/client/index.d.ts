import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type VisualAidKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'settings.visualAid': VisualAidKey;
    }
}
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map