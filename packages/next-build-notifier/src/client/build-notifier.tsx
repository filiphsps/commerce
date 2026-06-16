'use client';

import type { ReactNode } from 'react';

import type { BuildNotificationState } from '../shared/types';
import { useBuildNotification } from './context';

/**
 * Props for {@link BuildNotifier}: a render function receiving the live state.
 */
export type BuildNotifierProps = {
    children: (state: BuildNotificationState) => ReactNode;
};

/**
 * Headless render-prop over the build-notification state from the nearest provider. Renders exactly
 * what the function returns — no markup or styles of its own.
 *
 * @param props - See {@link BuildNotifierProps}.
 * @returns The render function's output.
 */
export function BuildNotifier({ children }: BuildNotifierProps): ReactNode {
    return children(useBuildNotification());
}
