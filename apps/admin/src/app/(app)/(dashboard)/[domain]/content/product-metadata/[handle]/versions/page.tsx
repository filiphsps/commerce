import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { restoreVersionAction } from '@/lib/cms-actions/restore-version';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

export const metadata: Metadata = { title: 'Product Metadata — Versions' };

type Params = Promise<{ domain: string; handle: string }>;

export default async function ProductMetadataVersionsPage({ params }: { params: Params }) {
    const { domain, handle: encodedHandle } = await params;
    const handle = decodeURIComponent(encodedHandle);
    const { payload, user, tenant } = await getAuthedPayloadCtx(domain);

    if (!tenant) {
        notFound();
    }

    // ── Resolve the doc id from (tenant, handle) ──────────────────────────────
    // Versions are anchored by `parent` (the doc id), so we need the id before
    // calling findVersions. If no doc exists for this handle yet, there are no
    // versions to show — display an informational message rather than 404ing,
    // since the handle is valid even if the doc hasn't been saved yet.
    const { docs } = await payload.find({
        collection: 'productMetadata',
        where: {
            and: [{ tenant: { equals: tenant.id } }, { shopifyHandle: { equals: handle } }],
        },
        limit: 1,
        user,
        overrideAccess: false,
    });

    const doc = docs[0] ?? null;

    if (!doc) {
        return (
            <div className="mx-auto max-w-3xl px-6 py-10">
                <header className="mb-8 flex items-center justify-between">
                    <h1 className="font-semibold text-2xl">Product Metadata — Versions</h1>
                    <nav>
                        <Link
                            href={`/${domain}/content/product-metadata/${encodeURIComponent(handle)}/` as Route}
                            className="text-blue-600 text-sm hover:underline"
                        >
                            ← Back to editor
                        </Link>
                    </nav>
                </header>
                <p className="text-gray-500">No versions — this metadata hasn&apos;t been created yet.</p>
            </div>
        );
    }

    // ── Fetch versions for this doc ───────────────────────────────────────────
    // Filter by BOTH `parent` (to scope to this specific doc) AND
    // `version.tenant` (defense-in-depth against cross-tenant id-guessing).
    const { docs: versions } = await payload.findVersions({
        collection: 'productMetadata',
        where: {
            and: [
                { parent: { equals: doc.id } },
                { 'version.tenant': { equals: tenant.id } },
            ],
        },
        sort: '-updatedAt',
        limit: 50,
        user,
        overrideAccess: false,
    });

    const restoreMetadataVersion = (versionId: string) =>
        restoreVersionAction.bind(null, domain, 'productMetadata', versionId);

    return (
        <div className="mx-auto max-w-3xl px-6 py-10">
            <header className="mb-8 flex items-center justify-between">
                <h1 className="font-semibold text-2xl">Product Metadata — Versions</h1>
                <nav>
                    <Link
                        href={`/${domain}/content/product-metadata/${encodeURIComponent(handle)}/` as Route}
                        className="text-blue-600 text-sm hover:underline"
                    >
                        ← Back to editor
                    </Link>
                </nav>
            </header>

            <p className="mb-6 text-muted-foreground text-sm">
                Handle: <code className="rounded bg-muted px-1 py-0.5 text-xs">{handle}</code>
            </p>

            {versions.length === 0 ? (
                <p className="text-gray-500">No version history yet.</p>
            ) : (
                <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
                    {versions.map((v) => {
                        // v.version is the snapshot of the doc at the time this version
                        // was saved. v.latest === true means this version IS the current
                        // published state, so restoring it would be a no-op — disable
                        // the button to avoid confusion.
                        const isLatest = v.latest === true;

                        const versionData = v.version as unknown as Record<string, unknown>;
                        const updatedBy = versionData.updatedBy;
                        const authorLabel =
                            typeof updatedBy === 'object' && updatedBy !== null && 'email' in updatedBy
                                ? String((updatedBy as { email: unknown }).email)
                                : typeof updatedBy === 'string' && updatedBy.length > 0
                                  ? updatedBy
                                  : 'Unknown';

                        const restoreThis = restoreMetadataVersion(String(v.id));

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
