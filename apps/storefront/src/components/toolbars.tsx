import { VercelToolbar } from '@vercel/toolbar/next';

import type { ReactNode } from 'react';

export const isPreviewEnvironment = (domain: string = '') => {
    if (process.env.NODE_ENV === 'development') {
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
            <VercelToolbar />
            {children}
        </>
    );
}
