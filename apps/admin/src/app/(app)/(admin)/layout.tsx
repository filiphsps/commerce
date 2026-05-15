import 'server-only';

import type { Route } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

/**
 * Gate the entire `(admin)` route group to users with `role === 'admin'`.
 *
 * Called with no `domain` argument — admin routes are cross-tenant by design
 * and `getAuthedPayloadCtx()` returns `tenant: null` in that case.
 *
 * Navigation sub-header for the admin group (Operators, Tenants, Users…) is
 * deferred to Task 20 which updates the global navigation. For now the layout
 * just gates and passes through.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
    const { user } = await getAuthedPayloadCtx();
    if (user.role !== 'admin') {
        // Editors don't see admin routes — bounce to root (no info leak about
        // admin features existing).
        redirect('/' as Route);
    }
    return <>{children}</>;
}
