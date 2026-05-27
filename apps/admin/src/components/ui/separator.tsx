'use client';

import * as Primitive from '@radix-ui/react-separator';
import { type ComponentPropsWithoutRef, type ComponentRef, forwardRef } from 'react';

import { cn } from '@/utils/tailwind';

/**
 * Radix separator with sensible defaults (horizontal, decorative).
 *
 * @param props.className - Additional class names merged onto the separator element.
 * @param props.orientation - 'horizontal' (default, h-px w-full) or 'vertical' (h-full w-px).
 * @param props.decorative - When true (default) the separator is hidden from the accessibility tree.
 */
export const Separator = forwardRef<
    ComponentRef<typeof Primitive.Root>,
    ComponentPropsWithoutRef<typeof Primitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
    <Primitive.Root
        ref={ref}
        decorative={decorative}
        orientation={orientation}
        className={cn('shrink-0 bg-border', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)}
        {...props}
    />
));
Separator.displayName = Primitive.Root.displayName;
