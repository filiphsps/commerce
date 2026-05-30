'use client';

import * as Primitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { type ComponentPropsWithoutRef, type ComponentRef, forwardRef } from 'react';

import { cn } from '@/utils/tailwind';

export const Select = Primitive.Root;
export const SelectGroup = Primitive.Group;
export const SelectValue = Primitive.Value;

/**
 * Select trigger button rendering the current value with a chevron affordance.
 *
 * @param props.className - Additional class names merged onto the trigger element.
 * @param props.children - Trigger content, typically a `SelectValue`.
 */
export const SelectTrigger = forwardRef<
    ComponentRef<typeof Primitive.Trigger>,
    ComponentPropsWithoutRef<typeof Primitive.Trigger>
>(({ className, children, ...props }, ref) => (
    <Primitive.Trigger
        ref={ref}
        className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border-2 border-border bg-background px-3 py-1 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground [&>span]:truncate',
            className,
        )}
        {...props}
    >
        {children}
        <Primitive.Icon asChild>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Primitive.Icon>
    </Primitive.Trigger>
));
SelectTrigger.displayName = Primitive.Trigger.displayName;

/**
 * Scroll-up affordance shown at the top of an overflowing select list.
 *
 * @param props.className - Additional class names merged onto the button element.
 */
export const SelectScrollUpButton = forwardRef<
    ComponentRef<typeof Primitive.ScrollUpButton>,
    ComponentPropsWithoutRef<typeof Primitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
    <Primitive.ScrollUpButton
        ref={ref}
        className={cn('flex cursor-default items-center justify-center py-1', className)}
        {...props}
    >
        <ChevronUp className="h-4 w-4" />
    </Primitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = Primitive.ScrollUpButton.displayName;

/**
 * Scroll-down affordance shown at the bottom of an overflowing select list.
 *
 * @param props.className - Additional class names merged onto the button element.
 */
export const SelectScrollDownButton = forwardRef<
    ComponentRef<typeof Primitive.ScrollDownButton>,
    ComponentPropsWithoutRef<typeof Primitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
    <Primitive.ScrollDownButton
        ref={ref}
        className={cn('flex cursor-default items-center justify-center py-1', className)}
        {...props}
    >
        <ChevronDown className="h-4 w-4" />
    </Primitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = Primitive.ScrollDownButton.displayName;

/**
 * Portal-rendered select dropdown panel with animated open/close transitions.
 *
 * @param props.className - Additional class names merged onto the content element.
 * @param props.children - The select items to render.
 * @param props.position - Radix positioning strategy; defaults to `popper`.
 */
export const SelectContent = forwardRef<
    ComponentRef<typeof Primitive.Content>,
    ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
    <Primitive.Portal>
        <Primitive.Content
            ref={ref}
            position={position}
            className={cn(
                'relative z-50 max-h-96 min-w-32 overflow-hidden rounded-md border-2 border-border bg-popover text-popover-foreground shadow-md',
                'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=closed]:animate-out data-[state=open]:animate-in',
                position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
                className,
            )}
            {...props}
        >
            <SelectScrollUpButton />
            <Primitive.Viewport
                className={cn(
                    'p-1',
                    position === 'popper' &&
                        'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
                )}
            >
                {children}
            </Primitive.Viewport>
            <SelectScrollDownButton />
        </Primitive.Content>
    </Primitive.Portal>
));
SelectContent.displayName = Primitive.Content.displayName;

/**
 * Non-interactive label row used as a section heading inside a select list.
 *
 * @param props.className - Additional class names merged onto the label element.
 */
export const SelectLabel = forwardRef<
    ComponentRef<typeof Primitive.Label>,
    ComponentPropsWithoutRef<typeof Primitive.Label>
>(({ className, ...props }, ref) => (
    <Primitive.Label
        ref={ref}
        className={cn('px-2 py-1.5 font-bold text-muted-foreground text-xs uppercase tracking-wider', className)}
        {...props}
    />
));
SelectLabel.displayName = Primitive.Label.displayName;

/**
 * A single selectable option row, showing a check when active.
 *
 * @param props.className - Additional class names merged onto the item element.
 * @param props.children - The option's display content.
 */
export const SelectItem = forwardRef<
    ComponentRef<typeof Primitive.Item>,
    ComponentPropsWithoutRef<typeof Primitive.Item>
>(({ className, children, ...props }, ref) => (
    <Primitive.Item
        ref={ref}
        className={cn(
            'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pr-2 pl-8 font-medium text-sm outline-none transition-colors focus:bg-muted focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            className,
        )}
        {...props}
    >
        <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
            <Primitive.ItemIndicator>
                <Check className="h-4 w-4" />
            </Primitive.ItemIndicator>
        </span>
        <Primitive.ItemText>{children}</Primitive.ItemText>
    </Primitive.Item>
));
SelectItem.displayName = Primitive.Item.displayName;

/**
 * Horizontal rule separating groups of options inside a select list.
 *
 * @param props.className - Additional class names merged onto the separator element.
 */
export const SelectSeparator = forwardRef<
    ComponentRef<typeof Primitive.Separator>,
    ComponentPropsWithoutRef<typeof Primitive.Separator>
>(({ className, ...props }, ref) => (
    <Primitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
));
SelectSeparator.displayName = Primitive.Separator.displayName;
