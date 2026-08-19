import type { IApiClient } from '@deepseek-ai/dsh-api-remotes/client';
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './locales.ts';
export interface SettingsInjected {
    api: IApiClient;
}
export declare function VisualAidSection({ api, t }: PropsRuntime<'settings.section'> & PropsLocale<typeof NS> & SettingsInjected): import("react").JSX.Element;
export interface ToggleInjected {
    api: IApiClient;
}
export declare function VisualAidToggle({ sessionId, api, t }: PropsRuntime<'conversation.input.left'> & PropsLocale<typeof NS> & ToggleInjected): import("react").JSX.Element;
export interface VisionPanelInjected {
    api: IApiClient;
}
export declare function VisionPanel({ sessionId, api, t }: PropsRuntime<'conversation.input.left'> & PropsLocale<typeof NS> & VisionPanelInjected): import("react").JSX.Element;
export declare function VisualView({ sessionId, api, t }: PropsRuntime<'conversation.view'> & PropsLocale<typeof NS> & VisionPanelInjected): import("react").JSX.Element;
//# sourceMappingURL=components.d.ts.map