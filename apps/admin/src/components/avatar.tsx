'use client';

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import * as React from 'react';
import { cn } from '@/utils/tailwind';

/**
 * Circular avatar container sized at 36 px (size-9). Wraps Radix's Avatar root.
 *
 * @param props.className - Additional class names merged onto the root element.
 */
const Avatar = React.forwardRef<
    React.ElementRef<typeof AvatarPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
    <AvatarPrimitive.Root
        ref={ref}
        className={cn('relative flex size-9 shrink-0 overflow-hidden rounded-full', className)}
        {...props}
    />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

/**
 * Renders the avatar image; falls back to AvatarFallback when the image fails to load.
 *
 * @param props.className - Additional class names merged onto the image element.
 */
const AvatarImage = React.forwardRef<
    React.ElementRef<typeof AvatarPrimitive.Image>,
    React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
    <AvatarPrimitive.Image ref={ref} className={cn('aspect-square h-full w-full', className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

/**
 * Fallback content displayed when the avatar image is absent or fails to load.
 *
 * @param props.className - Additional class names merged onto the fallback element.
 */
const AvatarFallback = React.forwardRef<
    React.ElementRef<typeof AvatarPrimitive.Fallback>,
    React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
    <AvatarPrimitive.Fallback
        ref={ref}
        className={cn('flex h-full w-full items-center justify-center rounded-full bg-muted', className)}
        {...props}
    />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarFallback, AvatarImage };
