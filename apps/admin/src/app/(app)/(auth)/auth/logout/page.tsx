import { Loader2 } from 'lucide-react';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { LogoutAction } from './logout-action';

export const metadata: Metadata = {
    title: 'Logout',
};

/**
 * The logout screen: brand-consistent {@link AuthShell} showing a sign-out status while the client
 * {@link LogoutAction} tears down the NextAuth session and redirects home.
 *
 * @returns The logout screen.
 */
export default async function IndexAdminPage() {
    return (
        <AuthShell eyebrow="See you soon" title="Signing out…">
            <div className="flex items-center gap-3 rounded-xl border-3 border-border border-solid bg-background/40 p-4">
                <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
                <span className="text-muted-foreground text-sm">Clearing your session and signing you out…</span>
            </div>

            <Suspense>
                <LogoutAction />
            </Suspense>
        </AuthShell>
    );
}
