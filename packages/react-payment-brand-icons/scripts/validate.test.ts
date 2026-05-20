import { describe, expect, it } from 'vitest';

import type { IconManifestEntry } from './types';
import { validateManifest } from './validate';

const entry = (over: Partial<IconManifestEntry> = {}): IconManifestEntry => ({
    slug: 'visa',
    componentName: 'Visa',
    title: 'Visa',
    aliases: [],
    ...over,
});

describe('validateManifest', () => {
    it('passes for a unique set of entries', () => {
        expect(() =>
            validateManifest([
                entry({ slug: 'visa', componentName: 'Visa' }),
                entry({ slug: 'mastercard', componentName: 'Mastercard' }),
            ]),
        ).not.toThrow();
    });

    it('throws on duplicate componentName', () => {
        expect(() =>
            validateManifest([
                entry({ slug: 'visa', componentName: 'Visa' }),
                entry({ slug: 'visa_card', componentName: 'Visa' }),
            ]),
        ).toThrow(/Duplicate componentName "Visa".*visa.*visa_card/s);
    });

    it('throws on duplicate slug', () => {
        expect(() =>
            validateManifest([
                entry({ slug: 'visa', componentName: 'Visa' }),
                entry({ slug: 'visa', componentName: 'VisaTwo' }),
            ]),
        ).toThrow(/Duplicate slug "visa"/);
    });

    it('throws when an alias collides with another canonical slug', () => {
        expect(() =>
            validateManifest([
                entry({ slug: 'visa', componentName: 'Visa', aliases: ['amex'] }),
                entry({ slug: 'amex', componentName: 'Amex' }),
            ]),
        ).toThrow(/Alias "amex" .* collides with canonical slug/);
    });

    it('throws when two icons share the same alias', () => {
        expect(() =>
            validateManifest([
                entry({ slug: 'visa', componentName: 'Visa', aliases: ['shared'] }),
                entry({ slug: 'mastercard', componentName: 'Mastercard', aliases: ['shared'] }),
            ]),
        ).toThrow(/Alias "shared" .* declared on multiple icons/);
    });
});
