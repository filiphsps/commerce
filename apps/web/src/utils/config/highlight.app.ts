import { AppRouterHighlight } from '@highlight-run/next/server';
import { highlightConfig } from './highlight';

export const withAppRouterHighlight = AppRouterHighlight({
    ...(highlightConfig as any)
});
