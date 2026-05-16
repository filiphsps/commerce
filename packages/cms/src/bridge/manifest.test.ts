import { describe, expect, it } from 'vitest';
import type { BridgeManifest } from './manifest';
import { assertFieldsValid, assertUniqueSlugs, defineBridge } from './manifest';

const noopAccess = () => true;
const noopAdapter = {
    findById: async () => null,
    update: async (_id: string, _patch: Record<string, unknown>) => ({}) as never,
};

const baseManifest = (overrides: Partial<BridgeManifest> = {}): BridgeManifest =>
    defineBridge({
        slug: 'shop',
        label: { singular: 'Shop', plural: 'Shops' },
        fields: [{ name: 'name', type: 'text', required: true }],
        adapter: noopAdapter,
        access: { read: noopAccess, update: noopAccess },
        ...overrides,
    });

describe('defineBridge', () => {
    it('returns the manifest unchanged', () => {
        const m = baseManifest();
        expect(m.slug).toBe('shop');
        expect(m.label.singular).toBe('Shop');
    });
});

describe('assertUniqueSlugs', () => {
    it('passes when slugs are unique', () => {
        expect(() => assertUniqueSlugs([baseManifest(), baseManifest({ slug: 'feature-flag' })])).not.toThrow();
    });

    it('throws on duplicates', () => {
        expect(() => assertUniqueSlugs([baseManifest(), baseManifest()])).toThrow(/duplicate bridge slug: shop/i);
    });
});

describe('assertFieldsValid', () => {
    it('passes when fields have names and types', () => {
        expect(() => assertFieldsValid([baseManifest()])).not.toThrow();
    });

    it('throws when a field has no name', () => {
        const broken = baseManifest({
            // biome-ignore lint/suspicious/noExplicitAny: deliberate invalid input
            fields: [{ type: 'text' } as any],
        });
        expect(() => assertFieldsValid([broken])).toThrow(/missing `name`/i);
    });

    it('throws when a field has no type', () => {
        const broken = baseManifest({
            // biome-ignore lint/suspicious/noExplicitAny: deliberate invalid input
            fields: [{ name: 'foo' } as any],
        });
        expect(() => assertFieldsValid([broken])).toThrow(/missing `type`/i);
    });
});
