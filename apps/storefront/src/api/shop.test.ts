import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getGlobalServiceDomain } from './shop';

describe('api/shop', () => {
    describe('getGlobalServiceDomain', () => {
        let original: string | undefined;

        beforeEach(() => {
            original = process.env.SERVICE_DOMAIN;
        });

        afterEach(() => {
            if (original !== undefined) process.env.SERVICE_DOMAIN = original;
            else delete process.env.SERVICE_DOMAIN;
        });

        it('returns SERVICE_DOMAIN when set', () => {
            process.env.SERVICE_DOMAIN = 'shops.example.com';
            expect(getGlobalServiceDomain()).toBe('shops.example.com');
        });

        it('returns SERVICE_DOMAIN when set to a different value', () => {
            process.env.SERVICE_DOMAIN = 'apps.nordcom.io';
            expect(getGlobalServiceDomain()).toBe('apps.nordcom.io');
        });

        it('throws MissingEnvironmentVariableError when SERVICE_DOMAIN is unset', () => {
            delete process.env.SERVICE_DOMAIN;
            // ESM class identity can diverge across module instances; check name.
            let caught: unknown;
            try {
                getGlobalServiceDomain();
            } catch (err) {
                caught = err;
            }
            expect(caught).toBeDefined();
            expect((caught as Error).name).toBe('MissingEnvironmentVariableError');
        });

        it('throws MissingEnvironmentVariableError when SERVICE_DOMAIN is empty string (falsy)', () => {
            process.env.SERVICE_DOMAIN = '';
            let caught: unknown;
            try {
                getGlobalServiceDomain();
            } catch (err) {
                caught = err;
            }
            expect(caught).toBeDefined();
            expect((caught as Error).name).toBe('MissingEnvironmentVariableError');
        });
    });
});
