import { VercelToolbar } from '@vercel/toolbar/next';
import type { ReactNode } from 'react';
import { isPreviewEnv } from '@/utils/is-preview-env';

/**
 * Injects toolbars on development environments and staging builds.
 */
export function Toolbars({ children, domain }: { children?: ReactNode; domain: string }) {
    return (
        <>
            {isPreviewEnv(domain) ? <VercelToolbar /> : null}

            {children}
        </>
    );
}
