import 'server-only';

import { editorConvexBridge } from '@/lib/editor-convex-bridge';
import { getAuthedCmsCtx } from '@/lib/cms-ctx';

type Props = { params: Promise<{ domain: string; id: string }> };

/**
 * Inspector pane for an article document. Resolves the document from the Convex authority
 * (CUTOVER-05 — the route's `id` is a Convex document id, which the retired Payload-on-Mongo
 * snapshot cannot address) after confirming the operator's tenant context, and renders its
 * status + last-updated metadata. Renders nothing when the tenant or document is missing.
 *
 * @param props - The route params carrying the tenant domain and the document id.
 * @returns The inspector markup, or `null` when there is nothing to inspect.
 */
export default async function ArticleInspector({ params }: Props) {
    const { domain, id } = await params;
    const { tenant } = await getAuthedCmsCtx(domain);
    if (!tenant) return null;

    const article = await editorConvexBridge.getDocument({ collection: 'articles', documentId: id }).catch(() => null);
    if (!article) return null;

    return (
        <div className="flex flex-col gap-4">
            <h2 className="font-bold text-foreground text-xs uppercase tracking-wider">Inspector</h2>

            <section className="flex flex-col gap-2">
                <h3 className="font-bold text-muted-foreground text-xs uppercase">Status</h3>
                <p className="text-foreground text-sm">{article.status}</p>
            </section>

            <section className="flex flex-col gap-2">
                <h3 className="font-bold text-muted-foreground text-xs uppercase">Last updated</h3>
                <p className="text-foreground text-sm">{new Date(article.updatedAt).toLocaleString()}</p>
            </section>

            <section className="flex flex-col gap-2">
                <h3 className="font-bold text-muted-foreground text-xs uppercase">SEO</h3>
                <p className="text-muted-foreground text-xs">
                    Edit SEO fields in the main form. Right-pane SEO scoring lands later.
                </p>
            </section>
        </div>
    );
}
