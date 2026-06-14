import type { Id } from '../../../convex/convex/_generated/dataModel';
import type { MutationCtx } from '../../../convex/convex/_generated/server';
import { collaboratorFixtures } from './fixtures/collaborators';

/**
 * Seeds the advanced shop's collaborators in-process: each fixture user (idempotent by `email` via
 * `users.by_email`), its standalone identity (idempotent by `(provider, identity)`), a session, and a
 * `shopCollaborators` link (idempotent by `(shop, user)`). All inserts stamp the managed timestamps.
 *
 * @param ctx - A Convex mutation context.
 * @param shopId - The advanced shop the collaborators belong to.
 */
export async function seedCollaboratorsMutation(ctx: MutationCtx, shopId: Id<'shops'>): Promise<void> {
    const now = Date.now();
    for (const fixture of collaboratorFixtures) {
        const user = await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', fixture.user.email))
            .unique();
        const userId: Id<'users'> = user
            ? user._id
            : await ctx.db.insert('users', { ...fixture.user, createdAt: now, updatedAt: now });

        const identity = await ctx.db
            .query('identities')
            .withIndex('by_provider_identity', (q) =>
                q.eq('provider', fixture.identity.provider).eq('identity', fixture.identity.identity),
            )
            .unique();
        if (!identity) {
            await ctx.db.insert('identities', { ...fixture.identity, createdAt: now, updatedAt: now });
        }

        const session = await ctx.db
            .query('sessions')
            .withIndex('by_token', (q) => q.eq('token', fixture.session.token))
            .unique();
        if (!session) {
            await ctx.db.insert('sessions', {
                user: userId,
                token: fixture.session.token,
                expiresAt: fixture.session.expiresAt,
                createdAt: now,
                updatedAt: now,
            });
        }

        const link = await ctx.db
            .query('shopCollaborators')
            .withIndex('by_shop_user', (q) => q.eq('shop', shopId).eq('user', userId))
            .unique();
        if (!link) {
            await ctx.db.insert('shopCollaborators', { shop: shopId, user: userId, permissions: fixture.permissions });
        }
    }
}
