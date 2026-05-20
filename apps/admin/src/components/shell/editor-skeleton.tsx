import { PageHeader } from '@/components/shell/page-header';
import { Skeleton } from '@/components/shell/skeleton';

export function EditorSkeleton() {
    return (
        <div className="flex h-full min-w-0 flex-col">
            <PageHeader title="Loading…" />
            <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-10 w-1/4" />
            </div>
        </div>
    );
}
