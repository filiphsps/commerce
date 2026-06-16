/**
 * The shape returned by the version endpoint.
 */
export type VersionResponse = {
    /** The current deployment's build id. */
    id: string;
    /** Server timestamp (ms) the response was produced. */
    ts: number;
};

/**
 * Configuration for the build notifier engine, provider, and render-prop.
 */
export type BuildNotifierConfig = {
    /** The build id baked into the running client (e.g. `process.env.NEXT_PUBLIC_BUILD_ID`). */
    currentBuildId: string;
    /** Version endpoint path. Default `'/api/version'`. */
    endpoint?: string;
    /**
     * Periodic poll interval in ms. A falsy value (`0` or `undefined`) disables the timer; the
     * focus/visibility/online triggers still fire. Apps should pass an explicit value (e.g. `60_000`).
     */
    intervalMs?: number;
    /** Re-check on `window` focus. Default `true`. */
    refetchOnFocus?: boolean;
    /** Re-check when the tab becomes visible. Default `true`. */
    refetchOnVisible?: boolean;
    /** Re-check when the network reconnects (`online`). Default `true`. */
    refetchOnReconnect?: boolean;
    /** Skip the periodic tick while the tab is hidden. Default `true`. */
    pauseWhenHidden?: boolean;
    /** Hard-reload automatically the first time an update is detected. Default `false`. */
    autoReload?: boolean;
    /** `sessionStorage` key for per-build dismissal. Default `'next-build-notifier:dismissed'`. */
    storageKey?: string;
    /** Custom version fetcher. Defaults to a `no-store`, cache-busted fetch of `endpoint`. */
    fetcher?: (endpoint: string) => Promise<VersionResponse>;
    /** Called once per newly-detected build id. */
    onUpdateAvailable?: (latestBuildId: string) => void;
    /**
     * Master switch. Default `true`. The engine is also inert when `currentBuildId` is falsy or one
     * of `'development'` / `'dev'`, so it never polls in development.
     */
    enabled?: boolean;
};

/**
 * The reactive state + actions exposed by the engine, context hook, and render-prop.
 */
export type BuildNotificationState = {
    /** A newer build id was observed and not dismissed for that id. */
    updateAvailable: boolean;
    /**
     * `true` only while `updateAvailable` is also `true` and the user dismissed *this* build id —
     * there is nothing to dismiss otherwise. The per-id dismissal persists so a *newer* build
     * re-surfaces (flips `dismissed` back to `false`).
     */
    dismissed: boolean;
    /** The client's own baked build id. */
    currentBuildId: string;
    /** The latest build id observed from the endpoint, or `null` before the first check. */
    latestBuildId: string | null;
    /** Engine status. */
    status: 'idle' | 'checking' | 'error';
    /** Epoch ms of the last successful check, or `null`. */
    lastCheckedAt: number | null;
    /** Hard-reload the page (`window.location.reload()`). */
    reload: () => void;
    /** Dismiss the current update (persisted per build id). */
    dismiss: () => void;
    /** Trigger an immediate version check. */
    check: () => void;
};
