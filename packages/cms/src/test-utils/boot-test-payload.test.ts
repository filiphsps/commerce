import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bootTestPayload, type TestPayload } from './boot-test-payload';

describe('bootTestPayload', () => {
    let payload: TestPayload;

    beforeAll(async () => {
        payload = await bootTestPayload({ suite: 'boot-test-payload' });
    });

    afterAll(async () => {
        await payload.teardown();
    });

    it('returns a working Payload instance', () => {
        expect(payload.instance).toBeDefined();
        expect(typeof payload.instance.find).toBe('function');
    });

    it('uses a suite-suffixed database name', () => {
        expect(payload.dbName).toMatch(/^test_boot-test-payload_\d+$/);
    });
});
