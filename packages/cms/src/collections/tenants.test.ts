import type { Field } from 'payload';
import { describe, expect, it } from 'vitest';
import { tenants } from './tenants';

// Pure config introspection. Field-validation behavior ("rejects missing required
// fields") belongs to Payload itself — we just declare the schema correctly and
// trust Payload to enforce it. End-to-end enforcement is covered by the
// multi-tenant isolation suite, which boots Payload once for the access boundary.
describe('tenants collection', () => {
    const fields = (tenants.fields ?? []) as Field[];
    const byName = (name: string) => fields.find((f): f is Field & { name: string } => 'name' in f && f.name === name);

    it('declares the expected slug + admin title', () => {
        expect(tenants.slug).toBe('tenants');
        expect(tenants.admin?.useAsTitle).toBe('name');
    });

    it('requires name, slug, defaultLocale, and locales', () => {
        for (const name of ['name', 'slug', 'defaultLocale', 'locales']) {
            expect(byName(name)).toMatchObject({ required: true });
        }
    });

    it('makes slug unique and indexed (tenant resolution is keyed by it)', () => {
        const slug = byName('slug') as Field & { unique?: boolean; index?: boolean };
        expect(slug.unique).toBe(true);
        expect(slug.index).toBe(true);
    });

    it('indexes shopId so post-save tenant sync can findOne in O(1)', () => {
        expect(byName('shopId')).toMatchObject({ index: true });
    });

    it('defaults to en-US for defaultLocale and ["en-US"] for locales', () => {
        expect(byName('defaultLocale')).toMatchObject({ defaultValue: 'en-US' });
        expect(byName('locales')).toMatchObject({ defaultValue: ['en-US'] });
    });
});
