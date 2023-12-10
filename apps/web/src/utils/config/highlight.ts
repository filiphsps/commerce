export const highlightConfig = {
    projectID: process.env.NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID!,
    version: process.env.GIT_COMMIT_SHA || 'dev',
    privacySetting: 'none' as const,
    storageMode: 'localStorage' as const,
    inlineStylesheet: true,
    tracingOrigins: true,
    reportConsoleErrors: true,
    enableSegmentIntegration: true,
    enablePerformanceRecording: true,
    networkRecording: {
        enabled: true,
        recordHeadersAndBody: true,
        urlBlocklist: []
    },
    enableCanvasRecording: false
};
