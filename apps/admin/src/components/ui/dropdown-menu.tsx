'use client';

import * as Primitive from '@radix-ui/react-dropdown-menu';
import { type ComponentProps, type ComponentPropsWithoutRef, type ComponentRef, forwardRef } from 'react';

import { cn } from '@/utils/tailwind';

/**
 * DropdownMenu wrapper. Defaults `modal={false}` so shell dropdowns (account
 * menu, shop switcher) don't trap focus or block interaction with the rest of
 * the admin. Pass `modal={true}` for cases that should block.
 */
export function DropdownMenu(props: ComponentProps<typeof Primitive.Root>) {
    return <Primitive.Root modal={false} {...props} />;
}
export const DropdownMenuTrigger = Primitive.Trigger;
export const DropdownMenuGroup = Primitive.Group;

/**
 * Portal-rendered dropdown content panel with animated open/close transitions.
 *
 * @param props.className - Additional class names merged onto the content element.
 * @param props.sideOffset - Pixel gap between the trigger and the content panel; defaults to 4.
 */
export const DropdownMenuContent = forwardRef<
    ComponentRef<typeof Primitive.Content>,
    ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
    <Primitive.Portal>
        <Primitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                'z-50 min-w-32 overflow-hidden rounded-md border-2 border-border bg-popover p-1 text-popover-foreground shadow-md',
                'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=closed]:animate-out data-[state=open]:animate-in',
                className,
            )}
            {...props}
        />
    </Primitive.Portal>
));
DropdownMenuContent.displayName = Primitive.Content.displayName;

/**
 * A single actionable row inside a DropdownMenuContent.
 *
 * @param props.className - Additional class names merged onto the item element.
 * @param props.inset - When true adds left padding to align with inset-offset items.
 */
export const DropdownMenuItem = forwardRef<
    ComponentRef<typeof Primitive.Item>,
    ComponentPropsWithoutRef<typeof Primitive.Item> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
    <Primitive.Item
        ref={ref}
        className={cn(
            'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 font-medium text-sm outline-none transition-colors focus:bg-muted focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            inset && 'pl-8',
            className,
        )}
        {...props}
    />
));
DropdownMenuItem.displayName = Primitive.Item.displayName;

/**
 * Non-interactive label row used as a section heading inside a DropdownMenuContent.
 *
 * @param props.className - Additional class names merged onto the label element.
 * @param props.inset - When true adds left padding to align with inset-offset items.
 */
export const DropdownMenuLabel = forwardRef<
    ComponentRef<typeof Primitive.Label>,
    ComponentPropsWithoutRef<typeof Primitive.Label> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
    <Primitive.Label
        ref={ref}
        className={cn(
            'px-2 py-1.5 font-bold text-muted-foreground text-xs uppercase tracking-wider',
            inset && 'pl-8',
            className,
        )}
        {...props}
    />
));
DropdownMenuLabel.displayName = Primitive.Label.displayName;

/**
 * Horizontal rule separating groups of items inside a DropdownMenuContent.
 *
 * @param props.className - Additional class names merged onto the separator element.
 */
export const DropdownMenuSeparator = forwardRef<
    ComponentRef<typeof Primitive.Separator>,
    ComponentPropsWithoutRef<typeof Primitive.Separator>
>(({ className, ...props }, ref) => (
    <Primitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
));
DropdownMenuSeparator.displayName = Primitive.Separator.displayName;
