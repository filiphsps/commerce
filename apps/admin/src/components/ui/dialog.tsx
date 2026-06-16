'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type ComponentPropsWithoutRef, type ComponentRef, forwardRef, type ReactNode } from 'react';

import { cn } from '@/utils/tailwind';

/**
 * Generic, reusable modal popup built on Radix's accessible Dialog primitive —
 * the admin's single source for centered overlays (the media picker, future
 * confirm/detail modals). Composes like the underlying primitive
 * (`Dialog` / `DialogTrigger` / `DialogContent` …) and inherits Radix's focus
 * trap, scroll lock, `Escape`-to-close, and labelling contract, so every popup
 * stays keyboard- and screen-reader-accessible by construction.
 *
 * The chrome (2px border, near-black surface, uppercase header) matches the rest
 * of the admin shell; size and layout are the caller's job via `className` on
 * {@link DialogContent}.
 */
export const Dialog = DialogPrimitive.Root;

/** The element that opens the dialog. Pass `asChild` to project onto a custom control. */
export const DialogTrigger = DialogPrimitive.Trigger;

/** Imperative close affordance — wrap a button with `asChild` to dismiss from inside the content. */
export const DialogClose = DialogPrimitive.Close;

/** Portal target; exported for callers that need to mount siblings beside the content. */
export const DialogPortal = DialogPrimitive.Portal;

/**
 * The dimmed, blurred backdrop behind the dialog. Rendered for callers that
 * compose the portal by hand; {@link DialogContent} already includes one.
 *
 * @param props.className - Extra classes merged onto the overlay.
 * @returns The overlay element.
 */
export const DialogOverlay = forwardRef<
    ComponentRef<typeof DialogPrimitive.Overlay>,
    ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in',
            className,
        )}
        {...props}
    />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * The dialog's portalled, focus-trapped panel — overlay plus a centered surface
 * carrying a built-in top-right close button. The default sizing is a comfortable
 * reading column; pass `className` to widen it (e.g. the media picker's two-pane
 * layout) or to control its internal flow.
 *
 * @param props.className - Extra classes merged onto the surface (sizing/layout).
 * @param props.children - The dialog body.
 * @param props.showClose - Whether to render the built-in close button (default `true`).
 * @returns The portalled overlay + content surface.
 */
export const DialogContent = forwardRef<
    ComponentRef<typeof DialogPrimitive.Content>,
    ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { showClose?: boolean }
>(({ className, children, showClose = true, ...props }, ref) => (
    <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border-2 border-border bg-background shadow-2xl outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
                className,
            )}
            {...props}
        >
            {children}
            {showClose ? (
                <DialogPrimitive.Close
                    className="absolute top-3.5 right-3.5 flex size-8 appearance-none items-center justify-center rounded-md border-2 border-transparent text-muted-foreground outline-none transition-colors hover:border-border hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Close"
                >
                    <X className="size-4" aria-hidden />
                </DialogPrimitive.Close>
            ) : null}
        </DialogPrimitive.Content>
    </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

/**
 * Sticky title row for the dialog — a bordered header band that keeps the title
 * (and the close button it sits beside) pinned while the body scrolls.
 *
 * @param props.className - Extra classes merged onto the header.
 * @param props.children - The header content (usually a {@link DialogTitle}).
 * @returns The header band.
 */
export function DialogHeader({ className, children }: { className?: string; children: ReactNode }) {
    return (
        <div className={cn('flex shrink-0 items-center gap-3 border-border border-b-2 px-5 py-4 pr-14', className)}>
            {children}
        </div>
    );
}

/**
 * Sticky footer row for the dialog — a top-bordered action band, right-aligned
 * by default, that stays in view beneath a scrolling body.
 *
 * @param props.className - Extra classes merged onto the footer.
 * @param props.children - The footer actions.
 * @returns The footer band.
 */
export function DialogFooter({ className, children }: { className?: string; children: ReactNode }) {
    return (
        <div
            className={cn(
                'flex shrink-0 items-center justify-end gap-2 border-border border-t-2 px-5 py-3.5',
                className,
            )}
        >
            {children}
        </div>
    );
}

/**
 * Accessible dialog title — labels the dialog for assistive tech and renders the
 * admin's uppercase header treatment. Every {@link DialogContent} must contain one.
 *
 * @param props.className - Extra classes merged onto the title.
 * @returns The title element.
 */
export const DialogTitle = forwardRef<
    ComponentRef<typeof DialogPrimitive.Title>,
    ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={cn('font-bold text-foreground text-sm uppercase tracking-wide', className)}
        {...props}
    />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

/**
 * Accessible dialog description, wired to the content via `aria-describedby`.
 * Render visually or wrap in a visually-hidden span when the layout has no room.
 *
 * @param props.className - Extra classes merged onto the description.
 * @returns The description element.
 */
export const DialogDescription = forwardRef<
    ComponentRef<typeof DialogPrimitive.Description>,
    ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description ref={ref} className={cn('text-muted-foreground text-sm', className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
