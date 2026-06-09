import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Preloaded } from 'convex/react';
import type { Session } from 'next-auth';
import { isValidElement, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { AccountProfileQuery } from '@/components/convex/account-profile-contract';
import AccountProfileIsland from '@/components/convex/account-profile-island';
import { AccountProfileSnapshotView } from '@/components/convex/account-profile-snapshot';
import { AccountProfile } from './account-profile';

const seam = vi.hoisted(() => ({
    preloadAccountProfile: vi.fn(),
}));

vi.mock('convex/nextjs', () => ({
    preloadQuery: vi.fn(),
}));

vi.mock('./account-live-island', async (importActual) => ({
    ...(await importActual<typeof import('./account-live-island')>()),
    preloadAccountProfile: seam.preloadAccountProfile,
}));

/** Directory of this test file, for source-structure assertions. */
const HERE = dirname(fileURLToPath(import.meta.url));

/** Authenticated customer session fixture. */
const SESSION = {
    expires: '2099-01-01T00:00:00.000Z',
    user: { id: 'customer-1', name: 'Jane Customer', email: 'jane@example.com', image: null },
} as Session;

/** Opaque preloaded handle sentinel. */
const PRELOADED = { _name: 'account/profile:get' } as unknown as Preloaded<AccountProfileQuery>;

describe('AccountProfile (server parent)', () => {
    it('renders the read-only snapshot without mounting the live island when the preload seam downgrades (kill switch / no token / auth failure)', async () => {
        seam.preloadAccountProfile.mockResolvedValueOnce(null);

        const output = await AccountProfile({ session: SESSION });

        expect(isValidElement(output)).toBe(true);
        expect((output as ReactElement).type).toBe(AccountProfileSnapshotView);
        expect(((output as ReactElement).props as { profile: { email: string | null } }).profile.email).toBe(
            'jane@example.com',
        );
    });

    it('mounts the live island seeded with the preloaded snapshot when the surface is live', async () => {
        seam.preloadAccountProfile.mockResolvedValueOnce(PRELOADED);

        const output = await AccountProfile({ session: SESSION });

        expect(isValidElement(output)).toBe(true);
        expect((output as ReactElement).type).toBe(AccountProfileIsland);
        const props = (output as ReactElement).props as {
            preloaded: unknown;
            snapshot: { email: string | null };
        };
        expect(props.preloaded).toBe(PRELOADED);
        expect(props.snapshot.email).toBe('jane@example.com');
    });
});

describe('PPR structure: preloadQuery stays inside the dynamic hole', () => {
    it('keeps the preload seam and server parent out of every `use cache` scope', () => {
        // Neither module that can reach `preloadQuery` may opt into `use cache`.
        // Matches the directive STATEMENT form only, so prose mentions in
        // comments do not trip the gate.
        for (const file of ['account-live-island.ts', 'account-profile.tsx']) {
            const source = readFileSync(join(HERE, file), 'utf8');
            expect(/['"]use cache['"];/.test(source)).toBe(false);
        }
    });

    it('mounts AccountProfile inside the dynamic AccountSession hole, after connection(), never in the cached shell', () => {
        const page = readFileSync(join(HERE, 'page.tsx'), 'utf8');

        const shellStart = page.indexOf('function AccountShell');
        const sessionStart = page.indexOf('function AccountSession');
        expect(shellStart).toBeGreaterThan(-1);
        expect(sessionStart).toBeGreaterThan(shellStart);

        // The cached shell ('use cache') must not reference the island parent.
        const shellBody = page.slice(shellStart, sessionStart);
        expect(/['"]use cache['"];/.test(shellBody)).toBe(true);
        expect(shellBody.includes('AccountProfile')).toBe(false);

        // The dynamic hole opts out of prerendering BEFORE mounting the island.
        const sessionBody = page.slice(sessionStart);
        expect(/['"]use cache['"];/.test(sessionBody)).toBe(false);
        const connectionAt = sessionBody.indexOf('await connection()');
        const islandAt = sessionBody.indexOf('<AccountProfile');
        expect(connectionAt).toBeGreaterThan(-1);
        expect(islandAt).toBeGreaterThan(connectionAt);
    });
});
