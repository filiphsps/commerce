import { ErrorBoundary } from 'react-error-boundary';

import { BuildConfig } from '@/utils/build-config';
import { VercelToolbar } from '@vercel/toolbar/next';

import type { ReactNode } from 'react';

export const isPreviewEnvironment = (domain: string = '') => {
    if (['development', 'test'].includes(BuildConfig.environment)) {
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
            {isPreviewEnvironment(domain) ? (
                <ErrorBoundary fallbackRender={() => null}>
                    <VercelToolbar />
                </ErrorBoundary>
            ) : null}

            {children}
        </>
    );
}
