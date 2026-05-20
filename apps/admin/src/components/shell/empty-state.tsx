import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

export type EmptyStateProps = {
    icon?: ReactNode;
    label: string;
    description?: string;
    actionLabel?: string;
    actionHref?: Route;
};

export function EmptyState({ icon, label, description, actionLabel, actionHref }: EmptyStateProps) {
    return (
        <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 p-8 text-center">
            {icon ? <div className="text-muted-foreground">{icon}</div> : null}
            <p className="text-base font-semibold">{label}</p>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            {actionHref && actionLabel ? (
                <Button asChild variant="primary" size="sm" className="mt-2">
                    <Link href={actionHref}>{actionLabel}</Link>
                </Button>
            ) : null}
        </div>
    );
}
