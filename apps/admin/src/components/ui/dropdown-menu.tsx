'use client';

import * as Primitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight } from 'lucide-react';
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
export const DropdownMenuPortal = Primitive.Portal;
export const DropdownMenuSub = Primitive.Sub;
export const DropdownMenuRadioGroup = Primitive.RadioGroup;

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

export const DropdownMenuSeparator = forwardRef<
    ComponentRef<typeof Primitive.Separator>,
    ComponentPropsWithoutRef<typeof Primitive.Separator>
>(({ className, ...props }, ref) => (
    <Primitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
));
DropdownMenuSeparator.displayName = Primitive.Separator.displayName;

export const DropdownMenuCheckboxItem = forwardRef<
    ComponentRef<typeof Primitive.CheckboxItem>,
    ComponentPropsWithoutRef<typeof Primitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
    <Primitive.CheckboxItem
        ref={ref}
        className={cn(
            'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none focus:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            className,
        )}
        checked={checked}
        {...props}
    >
        <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
            <Primitive.ItemIndicator>
                <Check className="h-4 w-4" />
            </Primitive.ItemIndicator>
        </span>
        {children}
    </Primitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = Primitive.CheckboxItem.displayName;

export const DropdownMenuSubTrigger = forwardRef<
    ComponentRef<typeof Primitive.SubTrigger>,
    ComponentPropsWithoutRef<typeof Primitive.SubTrigger> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
    <Primitive.SubTrigger
        ref={ref}
        className={cn(
            'flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-muted data-[state=open]:bg-muted',
            inset && 'pl-8',
            className,
        )}
        {...props}
    >
        {children}
        <ChevronRight className="ml-auto h-4 w-4" />
    </Primitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = Primitive.SubTrigger.displayName;

export const DropdownMenuSubContent = forwardRef<
    ComponentRef<typeof Primitive.SubContent>,
    ComponentPropsWithoutRef<typeof Primitive.SubContent>
>(({ className, ...props }, ref) => (
    <Primitive.SubContent
        ref={ref}
        className={cn(
            'z-50 min-w-32 overflow-hidden rounded-md border-2 border-border bg-popover p-1 text-popover-foreground shadow-md',
            className,
        )}
        {...props}
    />
));
DropdownMenuSubContent.displayName = Primitive.SubContent.displayName;
