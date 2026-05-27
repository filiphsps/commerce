'use client';

import * as Primitive from '@radix-ui/react-tooltip';
import { type ComponentPropsWithoutRef, type ComponentRef, forwardRef } from 'react';

import { cn } from '@/utils/tailwind';

export const TooltipProvider = Primitive.Provider;
export const Tooltip = Primitive.Root;
export const TooltipTrigger = Primitive.Trigger;

/**
 * Portal-rendered tooltip content with animated delayed-open/close transitions.
 *
 * @param props.className - Additional class names merged onto the content element.
 * @param props.sideOffset - Pixel gap between the trigger and the tooltip; defaults to 4.
 */
export const TooltipContent = forwardRef<
    ComponentRef<typeof Primitive.Content>,
    ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
    <Primitive.Portal>
        <Primitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                'z-50 overflow-hidden rounded-md border-2 border-border bg-popover px-2 py-1 font-medium text-popover-foreground text-xs shadow-md',
                'data-[state=delayed-open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=closed]:animate-out data-[state=delayed-open]:animate-in',
                className,
            )}
            {...props}
        />
    </Primitive.Portal>
));
TooltipContent.displayName = Primitive.Content.displayName;
