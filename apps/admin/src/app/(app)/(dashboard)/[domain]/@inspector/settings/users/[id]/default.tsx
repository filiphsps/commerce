import 'server-only';

import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

type Props = { params: Promise<{ domain: string; id: string }> };

export default async function UserInspector({ params }: Props) {
    const { domain, id } = await params;
    const { payload, user } = await getAuthedPayloadCtx(domain);
    if (user.role !== 'admin') return null;

    const u = await payload
        .findByID({ collection: 'users', id, user: user as never, overrideAccess: false })
        .catch(() => null);
    if (!u) return null;

    return (
        <div className="flex flex-col gap-4">
            <h2 className="font-bold text-foreground text-xs uppercase tracking-wider">User</h2>
            <p className="text-foreground text-sm">{(u as { email?: string }).email}</p>
            <p className="font-bold text-muted-foreground text-xs uppercase">Role: {(u as { role?: string }).role}</p>
        </div>
    );
}
