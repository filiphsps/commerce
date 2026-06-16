'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { reload } from '../shared/reload';
import type { BuildNotificationState, BuildNotifierConfig } from '../shared/types';
import { defaultFetcher } from './default-fetcher';
import { readDismissed, writeDismissed } from './dismissal';

const DEV_IDS = new Set(['', 'development', 'dev']);

/**
 * The polling/compare/dismiss engine behind {@link BuildNotifierProvider}. Most consumers use the
 * provider + {@link useBuildNotification} instead of calling this directly.
 *
 * Behavior: derives `active` from `enabled` and a non-dev `currentBuildId`; on mount (and on the
 * configured triggers/interval) fetches the endpoint and compares the returned id to
 * `currentBuildId`. A mismatch sets `updateAvailable`; `onUpdateAvailable` fires once per new id and
 * `autoReload` (if set) hard-reloads. Dismissal is keyed by the latest id in `sessionStorage`.
 *
 * @param config - See {@link BuildNotifierConfig}.
 * @returns The reactive {@link BuildNotificationState}.
 */
export function useBuildNotifierEngine(config: BuildNotifierConfig): BuildNotificationState {
    const {
        currentBuildId,
        endpoint = '/api/version',
        intervalMs,
        refetchOnFocus = true,
        refetchOnVisible = true,
        refetchOnReconnect = true,
        pauseWhenHidden = true,
        autoReload = false,
        storageKey = 'next-build-notifier:dismissed',
        fetcher = defaultFetcher,
        onUpdateAvailable,
        enabled = true,
    } = config;

    const active = enabled && !DEV_IDS.has(currentBuildId);

    const [latestBuildId, setLatestBuildId] = useState<string | null>(null);
    const [status, setStatus] = useState<BuildNotificationState['status']>('idle');
    const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
    const [dismissedId, setDismissedId] = useState<string | null>(() => readDismissed(storageKey));

    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;
    const onUpdateRef = useRef(onUpdateAvailable);
    onUpdateRef.current = onUpdateAvailable;
    const notifiedRef = useRef<string | null>(null);
    const latestBuildIdRef = useRef<string | null>(null);

    const updateAvailable = active && latestBuildId !== null && latestBuildId !== currentBuildId;
    const dismissed = updateAvailable && dismissedId === latestBuildId;

    const check = useCallback(async () => {
        if (!active) return;
        setStatus('checking');
        try {
            const res = await fetcherRef.current(endpoint);
            setLatestBuildId(res.id);
            latestBuildIdRef.current = res.id;
            setLastCheckedAt(Date.now());
            setStatus('idle');
        } catch {
            setStatus('error');
        }
    }, [active, endpoint]);

    // Fire side-effects once per newly-detected build id. `notifiedRef` is intentionally not reset on
    // unmount, so a React StrictMode dev double-mount runs the callback/autoReload only once.
    useEffect(() => {
        if (!updateAvailable || latestBuildId === null) return;
        if (notifiedRef.current === latestBuildId) return;
        notifiedRef.current = latestBuildId;
        onUpdateRef.current?.(latestBuildId);
        if (autoReload) reload();
    }, [updateAvailable, latestBuildId, autoReload]);

    // Initial check + event-driven re-checks.
    useEffect(() => {
        if (!active) return;
        void check();

        const onFocus = () => {
            if (refetchOnFocus) void check();
        };
        const onVisible = () => {
            if (refetchOnVisible && document.visibilityState === 'visible') void check();
        };
        const onOnline = () => {
            if (refetchOnReconnect) void check();
        };

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('online', onOnline);
        return () => {
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('online', onOnline);
        };
    }, [active, refetchOnFocus, refetchOnVisible, refetchOnReconnect, check]);

    // Periodic poll — disabled when intervalMs is falsy.
    useEffect(() => {
        if (!active || !intervalMs) return;
        const timer = setInterval(() => {
            if (pauseWhenHidden && document.visibilityState === 'hidden') return;
            void check();
        }, intervalMs);
        return () => clearInterval(timer);
    }, [active, intervalMs, pauseWhenHidden, check]);

    const dismiss = useCallback(() => {
        const current = latestBuildIdRef.current;
        if (current) {
            writeDismissed(storageKey, current);
            setDismissedId(current);
        }
    }, [storageKey]);

    const checkAction = useCallback(() => void check(), [check]);

    return {
        updateAvailable,
        dismissed,
        currentBuildId,
        latestBuildId,
        status,
        lastCheckedAt,
        reload,
        dismiss,
        check: checkAction,
    };
}
