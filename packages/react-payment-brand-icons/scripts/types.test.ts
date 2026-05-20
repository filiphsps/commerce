import { describe, expectTypeOf, it } from 'vitest';

import type { IconManifestEntry, IconOverride, IconOverrides } from './types';

describe('codegen types', () => {
    it('IconOverride allows partial overrides', () => {
        const a: IconOverride = { componentName: 'Visa' };
        const b: IconOverride = { title: 'Visa' };
        const c: IconOverride = { aliases: ['visa-card'] };
        const d: IconOverride = { componentName: 'Visa', title: 'Visa', aliases: ['v'] };
        expectTypeOf(a).toMatchTypeOf<IconOverride>();
        expectTypeOf(b).toMatchTypeOf<IconOverride>();
        expectTypeOf(c).toMatchTypeOf<IconOverride>();
        expectTypeOf(d).toMatchTypeOf<IconOverride>();
    });

    it('IconOverrides is keyed by slug', () => {
        const overrides: IconOverrides = {
            visa: { componentName: 'Visa', title: 'Visa' },
            mastercard: { componentName: 'Mastercard' },
        };
        expectTypeOf(overrides).toMatchTypeOf<Record<string, IconOverride>>();
    });

    it('IconManifestEntry has slug, componentName, title, aliases', () => {
        const entry: IconManifestEntry = {
            slug: 'visa',
            componentName: 'Visa',
            title: 'Visa',
            aliases: ['v'],
        };
        expectTypeOf(entry.slug).toBeString();
        expectTypeOf(entry.componentName).toBeString();
        expectTypeOf(entry.title).toBeString();
        expectTypeOf(entry.aliases).toEqualTypeOf<readonly string[]>();
    });
});
