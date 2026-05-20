import type { Route } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/tailwind';

export type EmptyStateProps = {
    label: string;
    description?: string;
    actionLabel?: string;
    actionHref?: string;
    className?: string;
};

export function EmptyState({ label, description, actionLabel, actionHref, className }: EmptyStateProps) {
    return (
        <div
            data-empty-state
            className={cn(
                'flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-border border-dashed px-8 py-16 text-center',
                className,
            )}
        >
            <div className="flex flex-col items-center gap-2">
                <p className="font-semibold text-foreground text-lg">{label}</p>
                {description ? <p className="max-w-sm text-muted-foreground text-sm">{description}</p> : null}
            </div>
            {actionHref && actionLabel ? (
                <Button asChild variant="primary" size="sm">
                    <Link href={actionHref as Route}>{actionLabel}</Link>
                </Button>
            ) : null}
        </div>
    );
}
