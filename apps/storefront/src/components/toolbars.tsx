import { ErrorBoundary } from 'react-error-boundary';

import { BuildConfig } from '@/utils/build-config';
import { VercelToolbar } from '@vercel/toolbar/next';

import type { ReactNode } from 'react';

export const isPreviewEnvironment = (domain: string = '') => {
    if (BuildConfig.environment === 'development') {
        return true;
    }

    const hn = domain.toLowerCase();
    return hn.startsWith('staging.') || hn.startsWith('preview.') || hn.includes('localhost') || false;
};

/**
 * Injects toolbars on development environments and staging builds.
 */
export function Toolbars({ children, domain }: { children?: ReactNode; domain: string }) {
    if (!isPreviewEnvironment(domain)) {
        return null;
    }

    return (
        <>
            <ErrorBoundary fallbackRender={() => null}>
                <VercelToolbar />
            </ErrorBoundary>

            {children}
        </>
    );
}
