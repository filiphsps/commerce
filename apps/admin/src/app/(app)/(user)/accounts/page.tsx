import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { ExternalLink, Link2 } from 'lucide-react';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/avatar';
import { SettingsSection } from '@/components/settings/settings-section';
import { getOwnAccount } from '@/lib/account-convex';
import { gravatarUrl } from '@/utils/gravatar';

import { ProfileForm } from './profile-form';
import { ThemeToggle } from './theme-toggle';

export const metadata: Metadata = {
    title: 'Account',
};

/**
 * Derives up-to-two uppercase initials from a name/email for the avatar fallback.
 *
 * @param source - The name or email to derive from.
 * @returns The initials.
 */
function initialsOf(source: string): string {
    return source
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
}

/**
 * Formats an epoch-ms timestamp as a human date (UTC, locale-stable).
 *
 * @param epochMs - The timestamp.
 * @returns The formatted date.
 */
function formatDate(epochMs: number): string {
    return new Date(epochMs).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

/**
 * A label/value row for the read-only account-info section.
 *
 * @param props.label - The field label.
 * @param props.children - The value content.
 * @returns The row.
 */
function InfoRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
            <span className="font-mono text-foreground text-sm">{children}</span>
        </div>
    );
}

/**
 * Operator account settings page. Reads the caller's own account view from Convex (authorized,
 * identity-scoped) and composes the Profile, Account-info, Connected-accounts, and Preferences
 * sections. Redirects unauthenticated requests to the login route.
 *
 * @returns The account settings view.
 */
export default async function AccountPage() {
    const { userId } = await auth();
    if (!userId) {
        redirect('/auth/sign-in/' as Route);
    }

    const account = await getOwnAccount();
    const avatar = gravatarUrl(account.email);

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-2">
            <header className="flex flex-col gap-1">
                <h1 className="font-black text-2xl uppercase tracking-tight">Account</h1>
                <p className="text-muted-foreground text-sm">Manage your operator profile and preferences.</p>
            </header>

            <SettingsSection title="Profile" description="Your display name and avatar.">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
                    <div className="flex flex-col items-center gap-2">
                        <Avatar className="size-20 border-2 border-border">
                            <AvatarImage src={avatar} alt={account.name} />
                            <AvatarFallback>{initialsOf(account.name || account.email)}</AvatarFallback>
                        </Avatar>
                        <p className="max-w-[12rem] text-center text-muted-foreground text-xs">
                            Avatar comes from{' '}
                            <a
                                href="https://gravatar.com"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-0.5 font-semibold text-foreground underline"
                            >
                                Gravatar
                                <ExternalLink className="h-3 w-3" />
                            </a>
                            . Change it there.
                        </p>
                    </div>
                    <div className="flex-1">
                        <ProfileForm initialName={account.name} />
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="Account" description="Read-only account details.">
                <div className="flex flex-col divide-y divide-border">
                    <InfoRow label="Email">{account.email}</InfoRow>
                    <InfoRow label="Member since">{formatDate(account.createdAt)}</InfoRow>
                    <InfoRow label="Email verified">{account.emailVerified ? 'Yes' : 'No'}</InfoRow>
                </div>
            </SettingsSection>

            <SettingsSection title="Connected accounts" description="Sign-in providers linked to your account.">
                {account.identities.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No connected accounts.</p>
                ) : (
                    <ul className="flex flex-col gap-3">
                        {account.identities.map((identity) => (
                            <li
                                key={`${identity.provider}:${identity.identity}`}
                                className="flex items-center justify-between gap-4 rounded-md border-2 border-border px-4 py-3"
                            >
                                <span className="flex items-center gap-2 font-semibold text-sm capitalize">
                                    <Link2 className="h-4 w-4" />
                                    {identity.provider}
                                </span>
                                <span className="font-mono text-muted-foreground text-xs">
                                    Linked {formatDate(identity.createdAt)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </SettingsSection>

            <SettingsSection
                title="Preferences"
                description="Theme follows your system by default. Light mode is coming soon."
            >
                <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-sm">Theme</span>
                    <ThemeToggle initialTheme={account.theme} />
                </div>
            </SettingsSection>
        </div>
    );
}
