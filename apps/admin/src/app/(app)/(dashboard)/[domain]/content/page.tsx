import 'server-only';

import { allManifests } from '@nordcom/commerce-cms/editor/manifests';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentScrollRegion } from '@/components/shell/content-scroll-region';
import { PageHeader } from '@/components/shell/page-header';
import { getAuthedCmsCtx } from '@/lib/cms-ctx';
import { editorConvexBridge } from '@/lib/editor-convex-bridge';

/**
 * Derives a human-readable title from a Convex CMS document's serialized field map. Localized
 * fields may be stored as per-locale buckets, so a bucket-shaped `title` falls back to its first
 * string slot; the document id is the last resort so a row always renders a clickable label.
 *
 * @param data - The document's serialized field map.
 * @param fallback - Returned when no title-shaped value exists (the document id).
 * @returns The display title.
 */
function titleOf(data: Record<string, unknown>, fallback: string): string {
    const title = data.title;
    if (typeof title === 'string' && title.length > 0) return title;
    if (typeof title === 'object' && title !== null && !Array.isArray(title)) {
        const slot = Object.values(title).find((value) => typeof value === 'string' && value.length > 0);
        if (typeof slot === 'string') return slot;
    }
    return fallback;
}

/**
 * Reads the Shopify handle off a Convex CMS metadata document's serialized field map. The handle
 * is the collection's natural key — `documentTargetFor` keyField addressing routes the editor by
 * it — so the document id is only a last-resort label, never a navigable key.
 *
 * @param data - The document's serialized field map.
 * @param fallback - Returned when no handle exists (the document id).
 * @returns The Shopify handle used for both the row label and the editor route.
 */
function handleOf(data: Record<string, unknown>, fallback: string): string {
    const handle = data.shopifyHandle;
    return typeof handle === 'string' && handle.length > 0 ? handle : fallback;
}

export const metadata: Metadata = {
    title: 'Content',
};

type Params = Promise<{ domain: string }>;

// ── Tiny helper: card linking to a collection with its recent items ──────────

type CollectionCardRow = { id: string; title: string; href: Route };

function CollectionCard<T>({
    title,
    description,
    href,
    newHref,
    recent,
    formatRow,
}: {
    title: string;
    description: string;
    href: Route;
    newHref?: Route;
    recent: T[];
    formatRow: (item: T) => CollectionCardRow;
}) {
    return (
        <div className="flex flex-col gap-3 rounded-lg border-2 border-border border-solid bg-card p-4 text-card-foreground shadow-sm">
            <header className="flex flex-col gap-1">
                <h3 className="font-semibold text-base leading-none">{title}</h3>
                <p className="text-muted-foreground text-sm">{description}</p>
            </header>

            {recent.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No items yet.</p>
            ) : (
                <ul className="flex flex-col gap-1">
                    {recent.map((item) => {
                        const row = formatRow(item);
                        return (
                            <li key={row.id} className="truncate text-sm">
                                <Link
                                    href={row.href}
                                    className="cursor-pointer select-none hover:text-primary hover:underline"
                                >
                                    {row.title}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}

            <div className="mt-auto flex gap-2 pt-2">
                <Link href={href} className="text-primary text-sm hover:underline">
                    View all →
                </Link>
                {newHref && (
                    <Link href={newHref} className="text-muted-foreground text-sm hover:text-primary hover:underline">
                        + New
                    </Link>
                )}
            </div>
        </div>
    );
}

// ── Content singletons (globals) ─────────────────────────────────────────────

type GlobalCard = { collection: string; title: string; description?: string; href: Route };

/**
 * Derives the content-overview "Globals" cards from the editor manifest registry so a newly
 * registered singleton surfaces here automatically — no hand-maintained card list to drift out
 * of sync (the gap that hid the `search` singleton). A manifest is a content global when it is a
 * singleton (one row per tenant/domain, hence no list affordance) routed under `/content/`.
 *
 * @param domain - The tenant domain segment used to build each card's editor route.
 * @returns The ordered globals, mirroring the manifest-registry order.
 */
function contentGlobals(domain: string): GlobalCard[] {
    const contentBase = `/${domain}/content/`;
    return allManifests
        .filter((m) => {
            const isSingleton = m.tenant.kind === 'tenant-singleton' || m.tenant.kind === 'singleton-by-domain';
            return isSingleton && !m.list && m.routes.basePath(domain).startsWith(contentBase);
        })
        .map((m) => ({
            collection: m.collection,
            title: m.routes.label.singular,
            description: m.routes.description,
            href: m.routes.basePath(domain),
        }));
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ContentOverviewPage({ params }: { params: Params }) {
    const { domain } = await params;
    const { tenant } = await getAuthedCmsCtx(domain);

    if (!tenant) {
        notFound();
    }

    const urlBase = `/${domain}/content`;
    const globals = contentGlobals(domain);

    // Fetch recent activity per collection in parallel.
    // Defensive .catch so a single inaccessible collection doesn't break the overview.
    // Every card reads the Convex authority: `pages` since CUTOVER-04, and the rich-text cohort
    // (`articles` + the metadata overlays) since CUTOVER-05 — the Mongo copies are inert
    // snapshots whose ids no longer address the native editor routes. The metadata rows route by
    // their Shopify handle (`documentTargetFor` keyField addressing), so the handle comes off the
    // document's own data, never its Convex id.
    const [pages, articles, productMeta, collectionMeta] = await Promise.all([
        editorConvexBridge
            .list({ collection: 'pages', pageSize: 5 })
            .then((page) => ({
                docs: page.docs.map((doc) => ({ id: doc.documentId, title: titleOf(doc.data, doc.documentId) })),
            }))
            .catch(() => ({ docs: [] as Array<{ id: string; title: string }> })),
        editorConvexBridge
            .list({ collection: 'articles', pageSize: 5 })
            .then((page) => ({
                docs: page.docs.map((doc) => ({ id: doc.documentId, title: titleOf(doc.data, doc.documentId) })),
            }))
            .catch(() => ({ docs: [] as Array<{ id: string; title: string }> })),
        editorConvexBridge
            .list({ collection: 'productMetadata', pageSize: 5 })
            .then((page) => ({
                docs: page.docs.map((doc) => ({
                    id: doc.documentId,
                    shopifyHandle: handleOf(doc.data, doc.documentId),
                })),
            }))
            .catch(() => ({ docs: [] as Array<{ id: string; shopifyHandle: string }> })),
        editorConvexBridge
            .list({ collection: 'collectionMetadata', pageSize: 5 })
            .then((page) => ({
                docs: page.docs.map((doc) => ({
                    id: doc.documentId,
                    shopifyHandle: handleOf(doc.data, doc.documentId),
                })),
            }))
            .catch(() => ({ docs: [] as Array<{ id: string; shopifyHandle: string }> })),
    ]);

    return (
        <ContentScrollRegion>
            <PageHeader
                title="Content"
                meta={
                    <p className="text-muted-foreground text-sm">
                        Edit pages, articles, header/footer, and product/collection metadata for {domain}.
                    </p>
                }
            />
            <div className="flex flex-col gap-8 px-6 py-8">
                {/* ── Globals — no recent list, just navigation cards ──────────── */}
                <section className="flex flex-col gap-4">
                    <h2 className="font-semibold text-lg">Globals</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {globals.map((global) => (
                            <Link
                                key={global.collection}
                                href={global.href}
                                className="flex flex-col gap-2 rounded-lg border-2 border-border border-solid bg-card p-4 text-card-foreground shadow-sm hover:border-primary/50 hover:bg-card/80"
                            >
                                <h3 className="font-semibold text-base leading-none">{global.title}</h3>
                                {global.description && (
                                    <p className="text-muted-foreground text-sm">{global.description}</p>
                                )}
                            </Link>
                        ))}
                    </div>
                </section>

                {/* ── Tenant-scoped collections — card + recent items list ─────── */}
                <section className="flex flex-col gap-4">
                    <h2 className="font-semibold text-lg">Collections</h2>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <CollectionCard
                            title="Pages"
                            description="Marketing and landing pages."
                            href={`${urlBase}/pages/` as Route}
                            newHref={`${urlBase}/pages/new/` as Route}
                            recent={pages.docs}
                            formatRow={(p) => ({
                                id: String(p.id),
                                title: p.title,
                                href: `${urlBase}/pages/${p.id}/` as Route,
                            })}
                        />
                        <CollectionCard
                            title="Articles"
                            description="Blog posts."
                            href={`${urlBase}/articles/` as Route}
                            newHref={`${urlBase}/articles/new/` as Route}
                            recent={articles.docs}
                            formatRow={(a) => ({
                                id: String(a.id),
                                title: a.title,
                                href: `${urlBase}/articles/${a.id}/` as Route,
                            })}
                        />
                        <CollectionCard
                            title="Product metadata"
                            description="CMS overlay for Shopify products."
                            href={`${urlBase}/product-metadata/` as Route}
                            recent={productMeta.docs}
                            formatRow={(p) => ({
                                id: String(p.id),
                                title: p.shopifyHandle,
                                href: `${urlBase}/product-metadata/${encodeURIComponent(p.shopifyHandle)}/` as Route,
                            })}
                        />
                        <CollectionCard
                            title="Collection metadata"
                            description="CMS overlay for Shopify collections."
                            href={`${urlBase}/collection-metadata/` as Route}
                            recent={collectionMeta.docs}
                            formatRow={(c) => ({
                                id: String(c.id),
                                title: c.shopifyHandle,
                                href: `${urlBase}/collection-metadata/${encodeURIComponent(c.shopifyHandle)}/` as Route,
                            })}
                        />
                    </div>
                </section>
            </div>
        </ContentScrollRegion>
    );
}
