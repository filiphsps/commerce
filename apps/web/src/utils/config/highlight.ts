import type { Props as HighlightOptions } from '@highlight-run/next/client';

export const highlightConfig: HighlightOptions = {
    ...({ projectID: process.env.NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID! } as any),
    projectId: process.env.NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID!,
    version: process.env.GIT_COMMIT_SHA || 'dev',

    privacySetting: 'none' as const,
    storageMode: 'localStorage' as const,
    inlineStylesheet: false,
    inlineImages: false,
    tracingOrigins: true,
    reportConsoleErrors: true,
    networkRecording: {
        enabled: true,
        recordHeadersAndBody: true,
        urlBlocklist: []
    },

    enableSegmentIntegration: false,
    enablePerformanceRecording: false,
    enableCanvasRecording: false,

    disableBackgroundRecording: true,
    disableSessionRecording: true
};
