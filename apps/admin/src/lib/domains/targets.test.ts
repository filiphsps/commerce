import { describe, expect, it } from 'vitest';

import { buildRecordInstructions, isLocalhostDomain, VERCEL_A_RECORD, VERCEL_CNAME_TARGET } from './targets';

describe('isLocalhostDomain', () => {
    it('matches *.localhost and bare localhost, not real hosts', () => {
        expect(isLocalhostDomain('hello.localhost')).toBe(true);
        expect(isLocalhostDomain('localhost')).toBe(true);
        expect(isLocalhostDomain('shop.acme.com')).toBe(false);
    });
});

describe('buildRecordInstructions', () => {
    it('shows Vercel records when creds exist', () => {
        const records = buildRecordInstructions({ hasVercel: true, serviceDomain: 'shops.nordcom.io' });
        expect(records).toContainEqual({ kind: 'CNAME', host: 'subdomain', value: VERCEL_CNAME_TARGET });
        expect(records).toContainEqual({ kind: 'A', host: 'apex', value: VERCEL_A_RECORD });
    });

    it('shows the SERVICE_DOMAIN CNAME when there are no Vercel creds', () => {
        const records = buildRecordInstructions({ hasVercel: false, serviceDomain: 'shops.nordcom.io' });
        expect(records).toContainEqual({ kind: 'CNAME', host: 'subdomain', value: 'shops.nordcom.io' });
    });
});
