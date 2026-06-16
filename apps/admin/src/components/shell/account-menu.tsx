'use client';

import { UserButton } from '@clerk/nextjs';
import { SunMoon } from 'lucide-react';
import { useTheme } from '@/components/theme/theme-provider';
import { clerkAppearance } from '@/lib/clerk-appearance';

/**
 * Account control in the shell header: Clerk's `<UserButton>` themed to the admin tokens. It supplies
 * the avatar trigger, the "Manage account" entry (navigating to the existing `/accounts/` settings
 * page rather than opening a modal), and "Sign out" — replacing the previous bespoke avatar dropdown
 * and its custom sign-out wiring. The post-sign-out redirect to `/auth/sign-in` is configured once on
 * the root `<ClerkProvider afterSignOutUrl>`, so it is not repeated here.
 *
 * The shell's theme toggle survives the migration as a custom `<UserButton.Action>`: it flips the
 * operator's preference through {@link useTheme} (applying it to `<html data-theme>` and mirroring the
 * `admin-theme` cookie), the same in-place toggle the command palette exposes. Durable cross-device
 * persistence stays the account page's job; this is the lightweight per-session control.
 *
 * @returns The themed Clerk user button with the theme-toggle action.
 */
export function AccountMenu() {
    const { preference, setPreference } = useTheme();
    const nextPreference = preference === 'dark' ? 'system' : 'dark';
    const themeLabel = nextPreference === 'dark' ? 'Switch to dark theme' : 'Switch to system theme';

    return (
        <UserButton appearance={clerkAppearance} userProfileMode="navigation" userProfileUrl="/accounts/">
            <UserButton.MenuItems>
                <UserButton.Action
                    label={themeLabel}
                    labelIcon={<SunMoon className="size-4" />}
                    onClick={() => setPreference(nextPreference)}
                />
            </UserButton.MenuItems>
        </UserButton>
    );
}
