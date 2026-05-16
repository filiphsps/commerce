import { describe, expect, it } from 'vitest';
import { FeatureFlagSchema } from './feature-flag';

describe('models/feature-flag', () => {
    it('requires `key` and `defaultValue`', () => {
        const path = FeatureFlagSchema.path('key');
        expect(path).toBeDefined();
        expect(path.isRequired).toBe(true);
        expect(FeatureFlagSchema.path('defaultValue').isRequired).toBe(true);
    });

    it('declares `key` as unique', () => {
        const indexes = FeatureFlagSchema.indexes();
        const keyIndex = indexes.find(([fields]: [Record<string, unknown>, unknown]) => 'key' in fields);
        expect(keyIndex).toBeDefined();
        expect((keyIndex?.[1] as { unique?: boolean } | undefined)?.unique).toBe(true);
    });

    it('exposes `targeting` as an array of rule subdocuments', () => {
        const path = FeatureFlagSchema.path('targeting');
        expect(path.instance).toBe('Array');
    });

    it('exposes `options` as an optional array', () => {
        const path = FeatureFlagSchema.path('options');
        expect(path.instance).toBe('Array');
        expect(path.isRequired).toBeFalsy();
    });
});
