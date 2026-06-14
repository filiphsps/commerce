import { afterEach, describe, expect, it, vi } from 'vitest';

import * as dns from './dns';
import { checkDomainConnection } from './verify';

afterEach(() => vi.restoreAllMocks());

describe('checkDomainConnection', () => {
    it('accepts a CNAME at Vercel', async () => {
        vi.spyOn(dns, 'resolveDns').mockImplementation(async (_name, type) =>
            type === 'CNAME' ? ['cname.vercel-dns.com'] : [],
        );
        expect(await checkDomainConnection({ domain: 'shop.acme.com', serviceDomain: 'shops.nordcom.io' })).toEqual({
            connected: true,
            via: 'vercel',
        });
    });

    it('accepts a CNAME at SERVICE_DOMAIN', async () => {
        vi.spyOn(dns, 'resolveDns').mockImplementation(async (_name, type) =>
            type === 'CNAME' ? ['shops.nordcom.io'] : [],
        );
        expect(await checkDomainConnection({ domain: 'shop.acme.com', serviceDomain: 'shops.nordcom.io' })).toEqual({
            connected: true,
            via: 'service_domain',
        });
    });

    it('accepts an apex A record at Vercel', async () => {
        vi.spyOn(dns, 'resolveDns').mockImplementation(async (name, type) =>
            type === 'A' && name === 'acme.com' ? ['76.76.21.21'] : [],
        );
        expect(await checkDomainConnection({ domain: 'acme.com', serviceDomain: 'shops.nordcom.io' })).toEqual({
            connected: true,
            via: 'vercel',
        });
    });

    it('accepts an apex A record matching the SERVICE_DOMAIN IP', async () => {
        vi.spyOn(dns, 'resolveDns').mockImplementation(async (name, type) => {
            if (type === 'A' && name === 'acme.com') return ['203.0.113.10'];
            if (type === 'A' && name === 'shops.nordcom.io') return ['203.0.113.10'];
            return [];
        });
        expect(await checkDomainConnection({ domain: 'acme.com', serviceDomain: 'shops.nordcom.io' })).toEqual({
            connected: true,
            via: 'service_domain',
        });
    });

    it('reports not connected when nothing points at us', async () => {
        vi.spyOn(dns, 'resolveDns').mockImplementation(async (name, type) =>
            type === 'A' && name === 'shop.acme.com' ? ['1.2.3.4'] : [],
        );
        expect(await checkDomainConnection({ domain: 'shop.acme.com', serviceDomain: 'shops.nordcom.io' })).toEqual({
            connected: false,
        });
    });
});
