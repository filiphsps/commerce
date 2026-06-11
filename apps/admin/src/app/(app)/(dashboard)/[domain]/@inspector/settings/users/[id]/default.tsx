import 'server-only';

import { User } from '@nordcom/commerce-db';
import { getAuthedCmsCtx } from '@/lib/cms-ctx';

type Props = { params: Promise<{ domain: string; id: string }> };

/**
 * Inspector panel for a platform user: shows the selected user's email for
 * admin operators. Reads the Convex-backed `users` service directly — the
 * Payload principal mirror this panel used to query is gone (TEARDOWN-02) —
 * and renders nothing for non-admins or unknown ids.
 *
 * @param props.params - Route params carrying the tenant domain and the user id.
 * @returns The inspector fragment, or `null` when gated or the user is absent.
 */
export default async function UserInspector({ params }: Props) {
    const { domain, id } = await params;
    const { user } = await getAuthedCmsCtx(domain);
    if (user.role !== 'admin') return null;

    const inspected = await User.findById(id).catch(() => null);
    if (!inspected) return null;

    return (
        <div className="flex flex-col gap-4">
            <h2 className="font-bold text-foreground text-xs uppercase tracking-wider">User</h2>
            <p className="text-foreground text-sm">{inspected.email}</p>
        </div>
    );
}
