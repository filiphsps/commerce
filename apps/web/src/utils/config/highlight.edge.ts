import { EdgeHighlight } from '@highlight-run/next/server';
import { highlightConfig } from './highlight';

export const withEdgeHighlight = EdgeHighlight({
    ...(highlightConfig as any)
});
