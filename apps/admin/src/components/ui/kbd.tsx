import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '@/utils/tailwind';

/**
 * Styled keyboard key indicator rendered as a &lt;kbd&gt; element.
 *
 * @param props.className - Additional class names merged onto the kbd element.
 */
export const Kbd = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
    <kbd
        ref={ref}
        className={cn(
            'inline-flex h-5 select-none items-center gap-1 rounded border-2 border-border bg-muted px-1.5 font-mono font-semibold text-[10px] text-muted-foreground leading-none',
            className,
        )}
        {...props}
    />
));
Kbd.displayName = 'Kbd';
