import 'server-only';

import { Shop } from '@nordcom/commerce-db';

export async function getShopsForUser(userId: string) {
    // `sort` was a Mongoose-era option; Phase 2's payload.local-backed
    // `findByCollaborator` doesn't take options. The result is sorted by
    // Payload's default ('-createdAt') which matches the previous behavior.
    return Shop.findByCollaborator({ collaboratorId: userId }).then((res) =>
        res ? (Array.isArray(res) ? res : [res]) : [],
    );
}
