import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { restoreVersionAction } from '@/lib/cms-actions/restore-version';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

export const metadata: Metadata = { title: 'Footer — Versions' };

type Params = Promise<{ domain: string }>;

export default async function FooterVersionsPage({ params }: { params: Params }) {
    const { domain } = await params;
    const { payload, user, tenant } = await getAuthedPayloadCtx(domain);

    // `getAuthedPayloadCtx(domain)` calls notFound() when the domain doesn't
    // resolve to a tenant, so in practice this guard is never reached. It is
    // kept here to satisfy TypeScript (tenant is typed as nullable) and to
    // make the invariant explicit for future readers.
    if (!tenant) {
        notFound();
    }

    const { docs } = await payload.findVersions({
        collection: 'footer',
        where: { 'version.tenant': { equals: tenant.id } },
        sort: '-updatedAt',
        limit: 50,
        user,
        overrideAccess: false,
    });

    return (
        <div className="mx-auto max-w-3xl px-6 py-10">
            <header className="mb-8 flex items-center justify-between">
                <h1 className="font-semibold text-2xl">Footer — Versions</h1>
                <nav>
                    <Link
                        href={`/${domain}/content/footer/` as Route}
                        className="text-blue-600 text-sm hover:underline"
                    >
                        ← Back to editor
                    </Link>
                </nav>
            </header>

            {docs.length === 0 ? (
                <p className="text-gray-500">No version history yet.</p>
            ) : (
                <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
                    {docs.map((v) => {
                        // v.version is the snapshot of the footer doc at the time
                        // this version was saved. v.latest === true means this
                        // version IS the current published state, so restoring it
                        // would be a no-op — disable the button to avoid confusion.
                        const isLatest = v.latest === true;

                        // Author: v.version.updatedBy may be a populated User object
                        // or just an id string, depending on query depth. We request
                        // depth:0 (default) so it will be a string id or absent.
                        const versionData = v.version as unknown as Record<string, unknown>;
                        const updatedBy = versionData.updatedBy;
                        const authorLabel =
                            typeof updatedBy === 'object' && updatedBy !== null && 'email' in updatedBy
                                ? String((updatedBy as { email: unknown }).email)
                                : typeof updatedBy === 'string' && updatedBy.length > 0
                                  ? updatedBy
                                  : 'Unknown';

                        // The default revalidation target inside the action is
                        // `/${domain}/content/${collection}/`, which is exactly
                        // the edit route we'd want refreshed here — no override
                        // needed. The action also redirects to the versions list,
                        // so we don't need to handle navigation client-side.
                        const restoreThis = restoreVersionAction.bind(null, domain, 'footer', String(v.id));

                        return (
                            <li key={String(v.id)} className="flex items-center justify-between px-4 py-3">
                                <div className="flex flex-col gap-0.5">
                                    <time dateTime={v.updatedAt} className="font-medium text-gray-900 text-sm">
                                        {new Date(v.updatedAt).toLocaleString()}
                                    </time>
                                    <span className="text-gray-500 text-xs">{authorLabel}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {isLatest && (
                                        <span className="rounded bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs">
                                            Current
                                        </span>
                                    )}
                                    <form action={restoreThis}>
                                        <button
                                            type="submit"
                                            disabled={isLatest}
                                            className="rounded border border-gray-300 px-3 py-1 font-medium text-gray-700 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Restore
                                        </button>
                                    </form>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
