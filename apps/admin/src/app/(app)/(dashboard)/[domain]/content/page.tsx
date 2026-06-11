import 'server-only';

import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentScrollRegion } from '@/components/shell/content-scroll-region';
import { PageHeader } from '@/components/shell/page-header';
import { editorConvexBridge } from '@/lib/editor-convex-bridge';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

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

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ContentOverviewPage({ params }: { params: Params }) {
    const { domain } = await params;
    const { payload, user, tenant } = await getAuthedPayloadCtx(domain);

    if (!tenant) {
        notFound();
    }

    const urlBase = `/${domain}/content`;

    // Fetch recent activity per collection in parallel.
    // Defensive .catch so a single inaccessible collection doesn't break the overview.
    // `pages` reads the Convex authority (CUTOVER-04 — the Mongo copy is an inert snapshot whose
    // ids no longer address the native editor routes); the not-yet-flipped cohorts keep reading
    // Payload-on-Mongo until CUTOVER-05/06 move them.
    const [pages, articles, productMeta, collectionMeta] = await Promise.all([
        editorConvexBridge
            .list({ collection: 'pages', pageSize: 5 })
            .then((page) => ({
                docs: page.docs.map((doc) => ({ id: doc.documentId, title: titleOf(doc.data, doc.documentId) })),
            }))
            .catch(() => ({ docs: [] as Array<{ id: string; title: string }> })),
        payload
            .find({
                collection: 'articles',
                where: { tenant: { equals: tenant.id } },
                sort: '-updatedAt',
                limit: 5,
                user,
                overrideAccess: false,
            })
            .catch(() => ({ docs: [] as Array<{ id: string; title: string }> })),
        payload
            .find({
                collection: 'productMetadata',
                where: { tenant: { equals: tenant.id } },
                sort: '-updatedAt',
                limit: 5,
                user,
                overrideAccess: false,
            })
            .catch(() => ({ docs: [] as Array<{ id: string; shopifyHandle: string }> })),
        payload
            .find({
                collection: 'collectionMetadata',
                where: { tenant: { equals: tenant.id } },
                sort: '-updatedAt',
                limit: 5,
                user,
                overrideAccess: false,
            })
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
                        <Link
                            href={`${urlBase}/business-data/` as Route}
                            className="flex flex-col gap-2 rounded-lg border-2 border-border border-solid bg-card p-4 text-card-foreground shadow-sm hover:border-primary/50 hover:bg-card/80"
                        >
                            <h3 className="font-semibold text-base leading-none">Business data</h3>
                            <p className="text-muted-foreground text-sm">
                                Legal name, support contact, address, social profiles.
                            </p>
                        </Link>
                        <Link
                            href={`${urlBase}/header/` as Route}
                            className="flex flex-col gap-2 rounded-lg border-2 border-border border-solid bg-card p-4 text-card-foreground shadow-sm hover:border-primary/50 hover:bg-card/80"
                        >
                            <h3 className="font-semibold text-base leading-none">Header</h3>
                            <p className="text-muted-foreground text-sm">Logo, navigation, CTA, locale switcher.</p>
                        </Link>
                        <Link
                            href={`${urlBase}/footer/` as Route}
                            className="flex flex-col gap-2 rounded-lg border-2 border-border border-solid bg-card p-4 text-card-foreground shadow-sm hover:border-primary/50 hover:bg-card/80"
                        >
                            <h3 className="font-semibold text-base leading-none">Footer</h3>
                            <p className="text-muted-foreground text-sm">Sections, social links, legal links.</p>
                        </Link>
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
