'use client';

import { createContext, useContext } from 'react';

import type { BuildNotificationState } from '../shared/types';

/**
 * Context carrying the live {@link BuildNotificationState}. `null` outside a provider.
 */
export const BuildNotifierContext = createContext<BuildNotificationState | null>(null);

/**
 * Reads the live build-notification state from the nearest {@link BuildNotifierProvider}.
 *
 * @returns The current {@link BuildNotificationState}.
 * @throws {Error} When used outside a `BuildNotifierProvider`.
 */
export function useBuildNotification(): BuildNotificationState {
    const value = useContext(BuildNotifierContext);
    if (value === null) {
        throw new Error('useBuildNotification must be used within a <BuildNotifierProvider>.');
    }
    return value;
}
