import { VercelToolbar } from '@vercel/toolbar/next';
import type { ReactNode } from 'react';

export function Toolbars({ children }: { children?: ReactNode }) {
    return (
        <>
            <VercelToolbar />
            {children}
        </>
    );
}
