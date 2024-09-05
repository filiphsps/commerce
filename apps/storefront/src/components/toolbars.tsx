import { ErrorBoundary } from 'react-error-boundary';

import { BuildConfig } from '@/utils/build-config';
import { VercelToolbar } from '@vercel/toolbar/next';

import type { ReactNode } from 'react';

export const isPreviewEnvironment = (domain: string = '') => {
    if (BuildConfig.environment === 'development') {
        return true;
    }

    const hostname = domain.toLowerCase();
    return (
        ['staging', 'preview', 'beta'].some((sub) => hostname.startsWith(`${sub}.`)) ||
        hostname.includes('localhost') ||
        false
    );
};

/**
 * Injects toolbars on development environments and staging builds.
 */
export function Toolbars({ children, domain }: { children?: ReactNode; domain: string }) {
    return (
        <>
            <ErrorBoundary fallbackRender={() => null}>
                <VercelToolbar />
            </ErrorBoundary>

            {children}
        </>
    );
}
