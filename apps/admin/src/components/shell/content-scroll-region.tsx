import type { ReactNode } from 'react';

import { cn } from '@/utils/tailwind';

export type ContentScrollRegionProps = {
    children: ReactNode;
    className?: string;
};

/**
 * The single scroll container of the admin shell content pane. Owns the
 * sticky-top / sticky-bottom CSS for any <PageHeader data-page-header /> or
 * <PageFooter data-page-footer /> rendered as a direct child. Pages render
 * their headers/footers inline; this wrapper makes them stick.
 *
 * @param props.children - Page content rendered inside the scroll container.
 * @param props.className - Additional class names merged onto the scroll root.
 */
export function ContentScrollRegion({ children, className }: ContentScrollRegionProps) {
    return (
        <div
            data-scroll-root
            className={cn(
                'admin-shell-scroll relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto overflow-x-hidden',
                className,
            )}
        >
            {children}
        </div>
    );
}
