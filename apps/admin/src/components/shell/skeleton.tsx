import { cn } from '@/utils/tailwind';

export type SkeletonProps = {
    className?: string;
};

/**
 * Animated placeholder block for content that is loading.
 *
 * @param props.className - Additional class names merged onto the pulse element; use these to set size.
 */
export function Skeleton({ className }: SkeletonProps) {
    return <div className={cn('animate-pulse rounded-md bg-muted', className)} aria-hidden />;
}
