import { cn } from '@/utils/tailwind';

export type SkeletonProps = {
    className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
    return <div className={cn('animate-pulse rounded-md bg-muted', className)} aria-hidden />;
}
