import { describe, expectTypeOf, it } from 'vitest';

import type { IconManifestEntry, IconOverride, IconOverrides } from './types';

describe('codegen types', () => {
    it('IconOverride allows partial overrides', () => {
        const a: IconOverride = { componentName: 'Visa' };
        const b: IconOverride = { title: 'Visa' };
        const c: IconOverride = { aliases: ['visa-card'] };
        const d: IconOverride = { componentName: 'Visa', title: 'Visa', aliases: ['v'] };
        expectTypeOf(a).toExtend<IconOverride>();
        expectTypeOf(b).toExtend<IconOverride>();
        expectTypeOf(c).toExtend<IconOverride>();
        expectTypeOf(d).toExtend<IconOverride>();
    });

    it('IconOverrides is keyed by slug', () => {
        const overrides: IconOverrides = {
            visa: { componentName: 'Visa', title: 'Visa' },
            mastercard: { componentName: 'Mastercard' },
        };
        expectTypeOf(overrides).toExtend<Record<string, IconOverride>>();
    });

    it('IconManifestEntry has slug, componentName, title, aliases', () => {
        const entry: IconManifestEntry = {
            slug: 'visa',
            componentName: 'Visa',
            title: 'Visa',
            aliases: ['v'],
        };
        expectTypeOf(entry.slug).toBeString;
        expectTypeOf(entry.componentName).toBeString;
        expectTypeOf(entry.title).toBeString;
        expectTypeOf(entry.aliases).toEqualTypeOf<readonly string[]>();
    });
});
