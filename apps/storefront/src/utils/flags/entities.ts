import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Session } from 'next-auth';

export interface FlagUser {
    id: string;
    email?: string;
    groups?: string[];
    customerTags?: string[];
}

export interface FlagEntities {
    shop: OnlineShop;
    session: Session | null;
    user: FlagUser | null;
    visitorId: string;
}

export async function mapSessionToUser(session: Session | null): Promise<FlagUser | null> {
    if (!session?.user) return null;
    const u = session.user as Session['user'] & { id?: string; groups?: string[]; customerTags?: string[] };
    if (!u.id) return null;
    return {
        id: u.id,
        email: u.email ?? undefined,
        groups: u.groups,
        customerTags: u.customerTags,
    };
}
