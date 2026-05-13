import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildStoragePlugin, storagePluginFromEnv } from './storage';

describe('buildStoragePlugin', () => {
    it('returns a function (Payload plugin contract)', () => {
        const plugin = buildStoragePlugin({
            bucket: 'b',
            endpoint: 'https://s3.example',
            region: 'us-east-1',
            accessKeyId: 'k',
            secretAccessKey: 's',
        });
        expect(typeof plugin).toBe('function');
    });
});

describe('storagePluginFromEnv', () => {
    const ENV_KEYS = [
        'S3_BUCKET',
        'S3_ENDPOINT',
        'S3_REGION',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
    ] as const;

    const originals: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};
    beforeEach(() => {
        for (const key of ENV_KEYS) {
            originals[key] = process.env[key];
            delete process.env[key];
        }
    });
    afterEach(() => {
        for (const key of ENV_KEYS) {
            if (originals[key] === undefined) delete process.env[key];
            else process.env[key] = originals[key]!;
        }
        vi.unstubAllEnvs();
    });

    it('returns null when no env vars are set', () => {
        expect(storagePluginFromEnv()).toBeNull();
    });

    it('returns null when only some env vars are set (partial config)', () => {
        process.env.S3_BUCKET = 'b';
        process.env.S3_ENDPOINT = 'e';
        expect(storagePluginFromEnv()).toBeNull();
        process.env.S3_REGION = 'r';
        process.env.S3_ACCESS_KEY_ID = 'k';
        // still missing S3_SECRET_ACCESS_KEY
        expect(storagePluginFromEnv()).toBeNull();
    });

    it('returns null when any single value is an empty string', () => {
        process.env.S3_BUCKET = 'b';
        process.env.S3_ENDPOINT = 'e';
        process.env.S3_REGION = 'r';
        process.env.S3_ACCESS_KEY_ID = '';
        process.env.S3_SECRET_ACCESS_KEY = 's';
        expect(storagePluginFromEnv()).toBeNull();
    });

    it('returns a configured plugin when all env vars are present', () => {
        process.env.S3_BUCKET = 'b';
        process.env.S3_ENDPOINT = 'https://s3.example';
        process.env.S3_REGION = 'us-east-1';
        process.env.S3_ACCESS_KEY_ID = 'k';
        process.env.S3_SECRET_ACCESS_KEY = 's';
        const plugin = storagePluginFromEnv();
        expect(plugin).not.toBeNull();
        expect(typeof plugin).toBe('function');
    });
});
