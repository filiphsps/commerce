import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

export const metadata: Metadata = {
    title: 'Settings',
};

export type ShopSettingsPageProps = {
    params: Promise<{
        domain: string;
    }>;
};

export default async function ShopSettingsPage({ params }: ShopSettingsPageProps) {
    const { domain } = await params;
    const { user } = await getAuthedPayloadCtx(domain);
    const isAdmin = user.role === 'admin';

    return (
        <div className="flex flex-col gap-6 px-6 py-8">
            <header>
                <h1 className="font-semibold text-2xl">Settings</h1>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* General — available to all roles */}
                <div className="rounded-lg border border-border bg-card p-5">
                    <h2 className="mb-1 font-semibold text-base">General</h2>
                    <p className="mb-4 text-muted-foreground text-sm">Shop name, locale, and basic configuration.</p>
                    <Link
                        href={`/${domain}/settings/general/` as Route}
                        className="text-primary text-sm hover:underline"
                    >
                        Manage →
                    </Link>
                </div>

                {/* Tenants — admin only */}
                {isAdmin ? (
                    <div className="rounded-lg border border-border bg-card p-5">
                        <h2 className="mb-1 font-semibold text-base">Tenants</h2>
                        <p className="mb-4 text-muted-foreground text-sm">Create and manage tenant configurations.</p>
                        <Link
                            href={`/${domain}/settings/tenants/` as Route}
                            className="text-primary text-sm hover:underline"
                        >
                            Manage →
                        </Link>
                    </div>
                ) : null}

                {/* Users — admin only */}
                {isAdmin ? (
                    <div className="rounded-lg border border-border bg-card p-5">
                        <h2 className="mb-1 font-semibold text-base">Users</h2>
                        <p className="mb-4 text-muted-foreground text-sm">Invite and manage operator accounts.</p>
                        <Link
                            href={`/${domain}/settings/users/` as Route}
                            className="text-primary text-sm hover:underline"
                        >
                            Manage →
                        </Link>
                    </div>
                ) : null}

                {/* Media — admin only */}
                {isAdmin ? (
                    <div className="rounded-lg border border-border bg-card p-5">
                        <h2 className="mb-1 font-semibold text-base">Media</h2>
                        <p className="mb-4 text-muted-foreground text-sm">Upload and manage the media library.</p>
                        <Link
                            href={`/${domain}/settings/media/` as Route}
                            className="text-primary text-sm hover:underline"
                        >
                            Manage →
                        </Link>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
