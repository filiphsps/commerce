import 'server-only';

import { Shop } from '@nordcom/commerce-db';

export async function getShopsForUser(userId: string) {
    return Shop.findByCollaborator({
        collaboratorId: userId,
        sort: '-createdAt',
    }).then((res) => (res ? (Array.isArray(res) ? res : [res]) : []));
}
