import type { ReactNode } from 'react';

import { cn } from '@/utils/tailwind';

export type PageFooterProps = {
    children: ReactNode;
    /** When false, the footer renders inline rather than sticky-bottom. Default: true. */
    sticky?: boolean;
    className?: string;
};

export function PageFooter({ children, sticky = true, className }: PageFooterProps) {
    return (
        <div
            data-page-footer
            data-sticky={sticky ? '' : undefined}
            className={cn(
                'flex w-full flex-wrap items-center justify-between gap-3 border-0 border-border border-t-2 bg-background px-6 py-3',
                'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
                className,
            )}
        >
            {children}
        </div>
    );
}
