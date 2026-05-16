'use server';

import 'server-only';

import { createBridgeServerActions } from '@nordcom/commerce-cms/bridge';
import { shopBridge } from '@nordcom/commerce-cms/bridge/manifests';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

// The factory builds plain async methods that close over `shopBridge` + `getCtx`.
// Those plain methods are NOT server actions on their own — they're only safe
// to invoke server-side. To cross the RSC → Client boundary we re-export each
// method as a top-level `'use server'` async function below; Next.js encodes
// these as opaque action IDs, and `.bind(null, domain, id)` at the call site
// produces serializable partially-applied server actions.
const actions = createBridgeServerActions(shopBridge, async (domain: string) => {
    const { user } = await getAuthedPayloadCtx(domain);
    return {
        user: {
            id: user.id,
            role: user.role,
            tenants: user.tenants.map((t) => t.tenant),
        },
        domain,
    };
});

export async function shopUpdateAction(domain: string, id: string, formData: FormData): Promise<void> {
    await actions.updateAction(domain, id, formData);
}

export async function shopDeleteAction(domain: string, id: string): Promise<void> {
    await actions.deleteAction(domain, id);
}
