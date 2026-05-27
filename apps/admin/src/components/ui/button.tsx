import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

import { cn } from '@/utils/tailwind';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 rounded-md border-2 font-bold text-sm uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                primary: 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
                outline: 'border-border bg-transparent text-foreground hover:bg-muted',
                ghost: 'border-transparent bg-transparent text-foreground hover:bg-muted',
                destructive: 'border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90',
            },
            size: {
                sm: 'h-8 px-3',
                md: 'h-10 px-4',
                lg: 'h-12 px-6',
                icon: 'h-10 w-10 p-0',
            },
        },
        defaultVariants: { variant: 'primary', size: 'md' },
    },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof buttonVariants> & {
        /** When true, render the child element with the button's classes/handlers (Radix Slot). */
        asChild?: boolean;
    };

/**
 * Polymorphic button. When `asChild` is set, the underlying element is the
 * child (e.g. an `<a>`) and the forwarded ref points to that element rather
 * than an HTMLButtonElement. The `ref as never` cast intentionally widens the
 * ref to permit this — callers using `asChild` must type their own ref.
 *
 * @param props.className - Additional class names applied to the button or Slot element.
 * @param props.variant - Visual variant; defaults to 'primary'.
 * @param props.size - Size variant; defaults to 'md'.
 * @param props.asChild - When true the child element acts as the button (Radix Slot pattern).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';
        return <Comp ref={ref as never} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
    },
);
Button.displayName = 'Button';

export { buttonVariants };
