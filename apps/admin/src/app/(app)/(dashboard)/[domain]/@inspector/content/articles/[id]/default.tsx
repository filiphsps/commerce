import 'server-only';

import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

type Props = { params: Promise<{ domain: string; id: string }> };

export default async function ArticleInspector({ params }: Props) {
    const { domain, id } = await params;
    const { payload, user, tenant } = await getAuthedPayloadCtx(domain);
    if (!tenant) return null;

    const article = await payload
        .findByID({
            collection: 'articles',
            id,
            user: user as never,
            overrideAccess: false,
        })
        .catch(() => null);
    if (!article) return null;

    const updated = (article as { updatedAt?: string }).updatedAt;
    const status = (article as { _status?: string })._status;

    return (
        <div className="flex flex-col gap-4">
            <h2 className="font-bold text-foreground text-xs uppercase tracking-wider">Inspector</h2>

            <section className="flex flex-col gap-2">
                <h3 className="font-bold text-muted-foreground text-xs uppercase">Status</h3>
                <p className="text-foreground text-sm">{status ?? 'unknown'}</p>
            </section>

            {updated ? (
                <section className="flex flex-col gap-2">
                    <h3 className="font-bold text-muted-foreground text-xs uppercase">Last updated</h3>
                    <p className="text-foreground text-sm">{new Date(updated).toLocaleString()}</p>
                </section>
            ) : null}

            <section className="flex flex-col gap-2">
                <h3 className="font-bold text-muted-foreground text-xs uppercase">SEO</h3>
                <p className="text-muted-foreground text-xs">
                    Edit SEO fields in the main form. Right-pane SEO scoring lands later.
                </p>
            </section>
        </div>
    );
}
