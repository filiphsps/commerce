import { describe, expect, it } from 'vitest';
import { ShopSchema } from './shop';

describe('models/shop — featureFlags ref array', () => {
    it('declares featureFlags as an array of refs', () => {
        const path = ShopSchema.path('featureFlags');
        expect(path).toBeDefined();
        expect(path.instance).toBe('Array');
    });

    it('each featureFlags entry references the FeatureFlag model', () => {
        const path = ShopSchema.path('featureFlags') as unknown as {
            schema?: { path(name: string): { instance: string; options: { ref?: string } } };
            caster?: { schema?: { path(name: string): { instance: string; options: { ref?: string } } } };
            casterConstructor?: {
                schema?: { path(name: string): { instance: string; options: { ref?: string } } };
            };
        };
        const subSchema = path.schema ?? path.caster?.schema ?? path.casterConstructor?.schema;
        expect(subSchema).toBeDefined();
        const flagPath = subSchema!.path('flag');
        expect(flagPath.instance).toBe('ObjectId');
        expect(flagPath.options.ref).toBe('FeatureFlag');
    });
});
