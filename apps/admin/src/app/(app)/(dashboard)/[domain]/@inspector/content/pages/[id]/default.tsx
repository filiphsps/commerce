import 'server-only';

import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

type Props = { params: Promise<{ domain: string; id: string }> };

export default async function PageInspector({ params }: Props) {
    const { domain, id } = await params;
    const { payload, user, tenant } = await getAuthedPayloadCtx(domain);
    if (!tenant) return null;

    const page = await payload
        .findByID({ collection: 'pages', id, user: user as never, overrideAccess: false })
        .catch(() => null);
    if (!page) return null;

    const updated = (page as { updatedAt?: string }).updatedAt;
    const status = (page as { _status?: string })._status;

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
        </div>
    );
}
