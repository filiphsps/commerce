import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { findMultiMutationWrites } from './single-mutation-gate';

const here = dirname(fileURLToPath(import.meta.url));
const servicesDir = join(here, '..', 'services');

describe('single-mutation-per-write gate', () => {
    it('every service source issues at most one Convex mutation per write body', () => {
        const sources = readdirSync(servicesDir).filter((file) => file.endsWith('.ts') && !file.includes('.test.'));
        expect(sources.length).toBeGreaterThan(0);
        for (const file of sources) {
            const source = readFileSync(join(servicesDir, file), 'utf8');
            expect(findMultiMutationWrites(source), `${file} must not split a write across mutations`).toEqual([]);
        }
    });

    // The negative case: a write body that issues TWO transport mutations (a client-side
    // read-modify-write split across transactions) must be flagged, proving the gate can fail.
    it('flags a write body that issues two transport mutations', () => {
        const offending = `
            const backend = {
                create: async (input) => {
                    const identity = await convexServerMutation('db/identities:upsertByProviderIdentity', input);
                    await convexServerMutation('db/users:pushIdentity', { identity });
                    return identity;
                },
            };
        `;
        const violations = findMultiMutationWrites(offending);
        expect(violations).toHaveLength(1);
        expect(violations[0]?.count).toBe(2);
    });

    it('does not flag two writes that live in separate async bodies', () => {
        const compliant = `
            const a = async () => convexServerMutation('db/users:create', {});
            const b = async () => convexServerMutation('db/sessions:create', {});
        `;
        expect(findMultiMutationWrites(compliant)).toEqual([]);
    });
});
