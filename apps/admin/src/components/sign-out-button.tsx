'use client';

import { SignOutButton as ClerkSignOutButton } from '@clerk/nextjs';
import { LogOut } from 'lucide-react';

import { cn } from '@/utils/tailwind';

export type SignOutButtonProps = {
    /** Additional class names merged onto the button. */
    className?: string;
};

/**
 * Brand-styled sign-out control wrapping Clerk's unstyled `<SignOutButton>`. Replaces the deleted
 * NextAuth logout page/route: clicking ends the Clerk session and redirects to `/auth/sign-in`
 * (the `afterSignOutUrl` configured on `ClerkProvider`).
 *
 * @param props.className - Extra class names merged onto the button.
 * @returns The styled sign-out button.
 */
export function SignOutButton({ className }: SignOutButtonProps) {
    return (
        <ClerkSignOutButton>
            <button
                type="button"
                title="Sign out"
                className={cn(
                    'flex h-9 items-center gap-2 rounded-lg border-3 border-border border-solid px-3 font-semibold text-sm transition-colors hover:border-destructive hover:text-destructive-foreground',
                    className,
                )}
            >
                <LogOut className="size-4" />
                Sign out
            </button>
        </ClerkSignOutButton>
    );
}
