'use client';

import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import { type ComponentPropsWithoutRef, type ComponentRef, forwardRef } from 'react';

import { cn } from '@/utils/tailwind';

export const Command = forwardRef<
    ComponentRef<typeof CommandPrimitive>,
    ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
    <CommandPrimitive
        ref={ref}
        className={cn(
            'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
            className,
        )}
        {...props}
        key={props.key as undefined}
    />
));
Command.displayName = CommandPrimitive.displayName;

export const CommandInput = forwardRef<
    ComponentRef<typeof CommandPrimitive.Input>,
    ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
    <div className="flex items-center border-border border-b-2 px-3" data-cmdk-input-wrapper="">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <CommandPrimitive.Input
            ref={ref}
            className={cn(
                'flex h-12 w-full rounded-md border-none bg-transparent py-3 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
            {...props}
            key={props.key as undefined}
        />
    </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

export const CommandList = forwardRef<
    ComponentRef<typeof CommandPrimitive.List>,
    ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
    <CommandPrimitive.List
        ref={ref}
        className={cn('max-h-80 overflow-y-auto overflow-x-hidden p-2', className)}
        {...props}
        key={props.key as undefined}
    />
));
CommandList.displayName = CommandPrimitive.List.displayName;

export const CommandEmpty = forwardRef<
    ComponentRef<typeof CommandPrimitive.Empty>,
    ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(({ className, ...props }, ref) => (
    <CommandPrimitive.Empty
        ref={ref}
        className={cn('py-6 text-center text-muted-foreground text-sm', className)}
        {...props}
        key={props.key as undefined}
    />
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

export const CommandGroup = forwardRef<
    ComponentRef<typeof CommandPrimitive.Group>,
    ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
    <CommandPrimitive.Group
        ref={ref}
        className={cn(
            'overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-2 **:[[cmdk-group-heading]]:font-bold **:[[cmdk-group-heading]]:text-muted-foreground **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-wider',
            className,
        )}
        {...props}
        key={props.key as undefined}
    />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

export const CommandItem = forwardRef<
    ComponentRef<typeof CommandPrimitive.Item>,
    ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
    <CommandPrimitive.Item
        ref={ref}
        className={cn(
            'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-3 font-medium text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-muted data-[selected=true]:text-foreground data-[disabled=true]:opacity-50',
            className,
        )}
        {...props}
        key={props.key as undefined}
    />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;
