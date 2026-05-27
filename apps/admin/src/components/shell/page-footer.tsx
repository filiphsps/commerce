import type { ReactNode } from 'react';

import { cn } from '@/utils/tailwind';

export type PageFooterProps = {
    children: ReactNode;
    /** When false, the footer renders inline rather than sticky-bottom. Default: true. */
    sticky?: boolean;
    className?: string;
};

/**
 * Page-level footer bar, optionally sticky at the bottom of the ContentScrollRegion.
 *
 * @param props.children - Footer content, typically save/publish action buttons.
 * @param props.sticky - When true (default) the footer sticks to the bottom of the scroll container.
 * @param props.className - Additional class names merged onto the footer element.
 */
export function PageFooter({ children, sticky = true, className }: PageFooterProps) {
    return (
        <div
            data-page-footer
            data-sticky={sticky ? '' : undefined}
            className={cn(
                'flex w-full flex-col items-center justify-between gap-3 border-0 border-border border-t-2 bg-background px-6 py-3 md:flex-row md:flex-wrap',
                'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
                className,
            )}
        >
            {children}
        </div>
    );
}
