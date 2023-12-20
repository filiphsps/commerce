export const highlightConfig = {
    projectID: process.env.NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID!,
    version: process.env.GIT_COMMIT_SHA || 'dev',
    privacySetting: 'none' as const,
    storageMode: 'localStorage' as const,
    inlineStylesheet: false,
    tracingOrigins: true,
    reportConsoleErrors: true,
    enableSegmentIntegration: false,
    enablePerformanceRecording: false,
    networkRecording: {
        enabled: true,
        recordHeadersAndBody: true,
        urlBlocklist: []
    },
    enableCanvasRecording: false
};
