import 'server-only';

import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

type Props = { params: Promise<{ domain: string; id: string }> };

export default async function TenantInspector({ params }: Props) {
    const { domain, id } = await params;
    const { payload, user } = await getAuthedPayloadCtx(domain);
    if (user.role !== 'admin') return null;

    const tenant = await payload
        .findByID({ collection: 'tenants', id, user: user as never, overrideAccess: false })
        .catch(() => null);
    if (!tenant) return null;

    return (
        <div className="flex flex-col gap-4">
            <h2 className="font-bold text-foreground text-xs uppercase tracking-wider">Tenant</h2>
            <p className="text-foreground text-sm">{(tenant as { name?: string }).name}</p>
        </div>
    );
}
