'use server';

import 'server-only';

import { revalidatePath } from 'next/cache';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BusinessDataStatus = 'draft' | 'published';

/** Subset of the businessData collection fields that the form can supply. */
type BusinessDataInput = {
    legalName?: string;
    supportEmail?: string;
    supportPhone?: string;
    address?: {
        line1?: string;
        line2?: string;
        city?: string;
        region?: string;
        postalCode?: string;
        country?: string;
    };
    profiles?: Array<{
        platform: string;
        handle: string;
        url?: string;
    }>;
};

// ---------------------------------------------------------------------------
// FormData parsing
// ---------------------------------------------------------------------------

/**
 * Payload's `<Form action={fn}>` serializes the entire form state as a JSON
 * blob in a single FormData key named `_payload` (see
 * `@payloadcms/ui/dist/forms/Form/index.js`, `createFormData` callback).
 * We parse that blob and extract only the fields we expect — never trusting
 * caller-supplied `tenant` so cross-tenant forgery is impossible.
 */
function parseFormData(formData: FormData): BusinessDataInput {
    const raw = formData.get('_payload');
    if (!raw || typeof raw !== 'string') {
        return {};
    }

    let parsed: Record<string, unknown>;
    try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
        console.warn('[businessData] Failed to parse _payload JSON; treating as empty input');
        return {};
    }

    const address =
        parsed.address != null && typeof parsed.address === 'object'
            ? (parsed.address as Record<string, unknown>)
            : undefined;

    const rawProfiles = parsed.profiles;
    let profiles: BusinessDataInput['profiles'];
    if (Array.isArray(rawProfiles)) {
        profiles = rawProfiles
            .filter(
                (p): p is Record<string, unknown> => p != null && typeof p === 'object',
            )
            .map((p) => ({
                platform: typeof p.platform === 'string' ? p.platform : '',
                handle: typeof p.handle === 'string' ? p.handle : '',
                url: typeof p.url === 'string' ? p.url : undefined,
            }));
    }

    return {
        legalName: typeof parsed.legalName === 'string' ? parsed.legalName : undefined,
        supportEmail: typeof parsed.supportEmail === 'string' ? parsed.supportEmail : undefined,
        supportPhone: typeof parsed.supportPhone === 'string' ? parsed.supportPhone : undefined,
        address: address
            ? {
                  line1: typeof address.line1 === 'string' ? address.line1 : undefined,
                  line2: typeof address.line2 === 'string' ? address.line2 : undefined,
                  city: typeof address.city === 'string' ? address.city : undefined,
                  region: typeof address.region === 'string' ? address.region : undefined,
                  postalCode: typeof address.postalCode === 'string' ? address.postalCode : undefined,
                  country: typeof address.country === 'string' ? address.country : undefined,
              }
            : undefined,
        profiles,
    };
}

// ---------------------------------------------------------------------------
// Shared upsert helper (not exported)
// ---------------------------------------------------------------------------

async function upsert(domain: string, formData: FormData, status: BusinessDataStatus): Promise<void> {
    const { payload, user, tenant } = await getAuthedPayloadCtx(domain);

    // `getAuthedPayloadCtx(domain)` always resolves a non-null tenant when
    // domain is provided — it calls notFound() otherwise. The type says
    // nullable to support the cross-tenant admin case (no domain), but for
    // all server actions below domain is required, so we guard defensively.
    if (!tenant) {
        console.error('[businessData] upsert called without a resolved tenant');
        throw new Error('Tenant context is required for businessData actions');
    }

    const parsed = parseFormData(formData);

    const { docs } = await payload.find({
        collection: 'businessData',
        where: { tenant: { equals: tenant.id } },
        limit: 1,
        user,
        overrideAccess: false,
    });

    const existing = docs[0];

    if (existing) {
        await payload.update({
            collection: 'businessData',
            id: existing.id as string,
            data: { ...parsed, _status: status },
            user,
            overrideAccess: false,
        });
    } else {
        await payload.create({
            collection: 'businessData',
            data: { ...parsed, tenant: tenant.id, _status: status },
            user,
            overrideAccess: false,
        });
    }

    revalidatePath(`/${domain}/content/business-data`);
}

// ---------------------------------------------------------------------------
// Exported server actions
// ---------------------------------------------------------------------------

export async function saveBusinessDataDraftAction(domain: string, formData: FormData): Promise<void> {
    await upsert(domain, formData, 'draft');
}

export async function publishBusinessDataAction(domain: string, formData: FormData): Promise<void> {
    await upsert(domain, formData, 'published');
}
