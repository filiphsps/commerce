import 'server-only';

import { Shop } from '@nordcom/commerce-db';

/**
 * Fetches the shops accessible to the given user for use in the admin shell's shop switcher.
 *
 * @param userId - The authenticated user's id used to scope the shop list.
 * @returns Array of shops the user can access, sorted by creation date descending.
 */
export async function getShopsForUser(userId: string) {
    // `sort` was a Mongoose-era option; Phase 2's payload.local-backed
    // `findByCollaborator` doesn't take options. The result is sorted by
    // Payload's default ('-createdAt') which matches the previous behavior.
    return Shop.findByCollaborator({ collaboratorId: userId }).then((res) =>
        res ? (Array.isArray(res) ? res : [res]) : [],
    );
}
