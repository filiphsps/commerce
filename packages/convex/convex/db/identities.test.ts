import { makeFunctionReference } from 'convex/server';
import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it } from 'vitest';

import schema from '../schema';
import * as identities from './identities';

/**
 * The Convex isolate tsconfig ships no `@types/node`, so `process` is not a known global at type
 * level (production code bridges this in lib/env.ts); declare the minimal ambient shape the
 * server-secret gate reads.
 */
declare const process: { env: Record<string, string | undefined> };

const SERVER_SECRET = 'test-server-secret-value';

/**
 * convex-test resolves functions through a hand-built module map (see lib/system.test.ts for the
 * rationale); point the real `db/identities` module at its deployed path so the secret-gated
 * constructors under test run exactly as deployed.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/db/identities.ts': () => Promise.resolve(identities),
};

type UpsertArgs = {
    serverSecret: string;
    provider: string;
    identity: string;
    scope?: string;
    accessToken?: string;
    upsert?: boolean;
};

const upsertRef = makeFunctionReference<'mutation', UpsertArgs, { _id: string; scope?: string } | null>(
    'db/identities:upsertByProviderIdentity',
);

describe('db/identities:upsertByProviderIdentity', () => {
    afterEach(() => {
        delete process.env.CONVEX_SERVER_SECRET;
    });

    it('enforces (provider, identity) uniqueness inside the mutation: re-linking yields ONE row', async () => {
        process.env.CONVEX_SERVER_SECRET = SERVER_SECRET;
        const t = convexTest(schema, modules);

        const first = await t.mutation(upsertRef, {
            serverSecret: SERVER_SECRET,
            provider: 'github',
            identity: '42',
            scope: 'read:user',
            upsert: true,
        });
        const second = await t.mutation(upsertRef, {
            serverSecret: SERVER_SECRET,
            provider: 'github',
            identity: '42',
            scope: 'repo',
            upsert: true,
        });

        expect(first?._id).toBeDefined();
        expect(second?._id).toBe(first?._id);
        expect(second?.scope).toBe('repo');

        const rows = await t.run((ctx) => ctx.db.query('identities').collect());
        expect(rows).toHaveLength(1);
    });

    it('resolves null (and writes nothing) when the pair is absent and upsert was not requested', async () => {
        process.env.CONVEX_SERVER_SECRET = SERVER_SECRET;
        const t = convexTest(schema, modules);

        const result = await t.mutation(upsertRef, {
            serverSecret: SERVER_SECRET,
            provider: 'github',
            identity: 'missing',
        });

        expect(result).toBeNull();
        const rows = await t.run((ctx) => ctx.db.query('identities').collect());
        expect(rows).toHaveLength(0);
    });

    it('rejects a caller presenting the wrong server secret', async () => {
        process.env.CONVEX_SERVER_SECRET = SERVER_SECRET;
        const t = convexTest(schema, modules);

        await expect(
            t.mutation(upsertRef, { serverSecret: 'wrong', provider: 'github', identity: '42', upsert: true }),
        ).rejects.toMatchObject({ data: { code: 'SERVER_SECRET_INVALID' } });
    });
});
