'use client';

import * as Primitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { type ComponentPropsWithoutRef, type ComponentRef, forwardRef } from 'react';

import { cn } from '@/utils/tailwind';

export const Accordion = Primitive.Root;

/**
 * A single collapsible section wrapper inside an Accordion.
 *
 * @param props.className - Additional class names merged onto the item element.
 */
export const AccordionItem = forwardRef<
    ComponentRef<typeof Primitive.Item>,
    ComponentPropsWithoutRef<typeof Primitive.Item>
>(({ className, ...props }, ref) => (
    <Primitive.Item ref={ref} className={cn('border-border border-b', className)} {...props} />
));
AccordionItem.displayName = Primitive.Item.displayName;

/**
 * Header button that toggles its section, with a chevron that rotates on open.
 *
 * @param props.className - Additional class names merged onto the trigger element.
 * @param props.children - The header content.
 */
export const AccordionTrigger = forwardRef<
    ComponentRef<typeof Primitive.Trigger>,
    ComponentPropsWithoutRef<typeof Primitive.Trigger>
>(({ className, children, ...props }, ref) => (
    <Primitive.Header className="flex">
        <Primitive.Trigger
            ref={ref}
            className={cn(
                'flex flex-1 items-center justify-between gap-2 py-3 font-medium text-sm outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&[data-state=open]>svg]:rotate-180',
                className,
            )}
            {...props}
        >
            {children}
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
        </Primitive.Trigger>
    </Primitive.Header>
));
AccordionTrigger.displayName = Primitive.Trigger.displayName;

/**
 * Collapsible body of a section, animated open/closed via Radix height vars.
 *
 * @param props.className - Additional class names merged onto the inner content wrapper.
 * @param props.children - The section body content.
 */
export const AccordionContent = forwardRef<
    ComponentRef<typeof Primitive.Content>,
    ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, children, ...props }, ref) => (
    <Primitive.Content
        ref={ref}
        className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
        {...props}
    >
        <div className={cn('pb-3', className)}>{children}</div>
    </Primitive.Content>
));
AccordionContent.displayName = Primitive.Content.displayName;
