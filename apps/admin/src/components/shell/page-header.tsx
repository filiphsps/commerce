import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/utils/tailwind';

export type Breadcrumb = { label: string; href?: Route };

export type PageHeaderProps = {
    title: string;
    breadcrumbs?: Breadcrumb[];
    actions?: ReactNode;
    meta?: ReactNode;
    className?: string;
};

export function PageHeader({ title, breadcrumbs, actions, meta, className }: PageHeaderProps) {
    return (
        <header
            data-page-header
            className={cn('flex flex-col gap-2 border-0 border-border border-b-2 bg-background px-6 py-4', className)}
        >
            {breadcrumbs && breadcrumbs.length > 0 ? (
                <nav aria-label="Breadcrumb">
                    <ol className="flex items-center gap-1.5 text-muted-foreground text-xs uppercase tracking-wide">
                        {breadcrumbs.map((crumb, i) => {
                            const isLast = i === breadcrumbs.length - 1;
                            return (
                                <li key={i} className="flex items-center gap-1.5">
                                    {i > 0 ? <span aria-hidden="true">/</span> : null}
                                    {crumb.href && !isLast ? (
                                        <Link href={crumb.href} className="font-bold hover:text-foreground">
                                            {crumb.label}
                                        </Link>
                                    ) : (
                                        <span className={isLast ? 'font-bold text-foreground' : undefined}>
                                            {crumb.label}
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                </nav>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-extrabold text-2xl text-foreground leading-tight tracking-tight">{title}</h1>
                {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>

            {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
        </header>
    );
}
