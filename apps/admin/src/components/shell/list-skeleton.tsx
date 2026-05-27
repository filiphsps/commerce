import { PageHeader } from '@/components/shell/page-header';
import { Skeleton } from '@/components/shell/skeleton';

/**
 * Full-page loading skeleton for collection list routes while rows are streaming.
 *
 * @param props.title - Page title passed to PageHeader; defaults to 'Loading…'.
 */
export function ListSkeleton({ title = 'Loading…' }: { title?: string }) {
    return (
        <div className="flex h-full min-w-0 flex-col">
            <PageHeader title={title} />
            <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-y-auto px-6 py-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
        </div>
    );
}
