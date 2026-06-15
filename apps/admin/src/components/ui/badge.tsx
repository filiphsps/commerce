import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/utils/tailwind';

const badgeVariants = cva(
    'inline-flex items-center rounded-full px-2 py-0.5 font-medium text-[10px] uppercase tracking-wide',
    {
        variants: {
            variant: {
                muted: 'bg-muted text-muted-foreground',
                outline: 'border border-border text-muted-foreground',
                primary: 'bg-primary/15 text-primary',
                destructive: 'bg-destructive/15 text-destructive',
            },
        },
        defaultVariants: { variant: 'muted' },
    },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

/**
 * Small rounded status label — the admin's canonical pill for terse metadata
 * (counts, states, flags) shown beside headings and field labels.
 *
 * @param props.className - Extra classes merged onto the badge.
 * @param props.variant - Color treatment; defaults to `muted`.
 * @returns The badge element.
 */
export function Badge({ className, variant, ...props }: BadgeProps) {
    return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
