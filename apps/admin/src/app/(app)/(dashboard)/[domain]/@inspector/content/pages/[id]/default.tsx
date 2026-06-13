import 'server-only';

import { getAuthedCmsCtx } from '@/lib/cms-ctx';
import { editorConvexBridge } from '@/lib/editor-convex-bridge';

type Props = { params: Promise<{ domain: string; id: string }> };

/**
 * Inspector pane for a page document. Resolves the document from the Convex authority
 * (CUTOVER-04 — the route's `id` is a Convex document id, which the retired Payload-on-Mongo
 * snapshot cannot address) after confirming the operator's tenant context, and renders its
 * status + last-updated metadata. Renders nothing when the tenant or document is missing.
 *
 * @param props - The route params carrying the tenant domain and the document id.
 * @returns The inspector markup, or `null` when there is nothing to inspect.
 */
export default async function PageInspector({ params }: Props) {
    const { domain, id } = await params;
    const { tenant } = await getAuthedCmsCtx(domain);
    if (!tenant) return null;

    const page = await editorConvexBridge.getDocument({ collection: 'pages', documentId: id }).catch(() => null);
    if (!page) return null;

    return (
        <div className="flex flex-col gap-4">
            <h2 className="font-bold text-foreground text-xs uppercase tracking-wider">Inspector</h2>
            <section className="flex flex-col gap-2">
                <h3 className="font-bold text-muted-foreground text-xs uppercase">Status</h3>
                <p className="text-foreground text-sm">{page.status}</p>
            </section>
            <section className="flex flex-col gap-2">
                <h3 className="font-bold text-muted-foreground text-xs uppercase">Last updated</h3>
                <p className="text-foreground text-sm">{new Date(page.updatedAt).toLocaleString()}</p>
            </section>
        </div>
    );
}
