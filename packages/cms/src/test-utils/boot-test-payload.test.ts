import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bootTestPayload, type TestPayload } from './boot-test-payload';

describe('bootTestPayload', () => {
    let payload: TestPayload;

    beforeAll(async () => {
        payload = await bootTestPayload({ suite: 'boot-test-payload' });
    }, 30_000);

    afterAll(async () => {
        await payload.teardown();
    }, 30_000);

    it('returns a working Payload instance', () => {
        expect(payload.instance).toBeDefined();
        expect(typeof payload.instance.find).toBe('function');
    });

    it('uses a suite-suffixed database name', () => {
        expect(payload.dbName).toMatch(/^test_boot-test-payload_\d+$/);
    });

    describe('bridge registration', () => {
        it('exposes default bridge manifests under config.custom.bridges', () => {
            const bridges = (payload.instance.config.custom as { bridges?: Array<{ slug: string }> } | undefined)
                ?.bridges;
            expect(bridges).toBeDefined();
            expect(bridges?.map((b) => b.slug)).toContain('shop');
        });

        it('registers a hidden bridge:shop collection', () => {
            const slugs = payload.instance.config.collections.map((c) => c.slug);
            expect(slugs).toContain('bridge:shop');
            const c = payload.instance.config.collections.find((c) => c.slug === 'bridge:shop');
            expect(c?.admin?.hidden).toBe(true);
        });
    });
});
