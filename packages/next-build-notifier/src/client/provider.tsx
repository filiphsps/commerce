'use client';

import type { ReactNode } from 'react';

import type { BuildNotifierConfig } from '../shared/types';
import { BuildNotifierContext } from './context';
import { useBuildNotifierEngine } from './use-build-notifier-engine';

/**
 * Props for {@link BuildNotifierProvider}: every {@link BuildNotifierConfig} field plus `children`.
 */
export type BuildNotifierProviderProps = BuildNotifierConfig & {
    children: ReactNode;
};

/**
 * Runs the build-notifier engine and publishes its state via context. Place high in the tree; render
 * UI with {@link useBuildNotification} or {@link BuildNotifier}.
 *
 * @param props - See {@link BuildNotifierProviderProps}.
 * @returns The provider element.
 */
export function BuildNotifierProvider({ children, ...config }: BuildNotifierProviderProps): ReactNode {
    const state = useBuildNotifierEngine(config);
    return <BuildNotifierContext.Provider value={state}>{children}</BuildNotifierContext.Provider>;
}
