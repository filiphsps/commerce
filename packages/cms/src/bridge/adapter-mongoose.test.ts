import { describe, expect, it } from 'vitest';
import { coerceMissingGroups, defaultToPlain } from './adapter-mongoose';
import type { BridgeManifest } from './manifest';

describe('defaultToPlain', () => {
    it('handles a doc with a .toObject method (mongoose doc)', () => {
        const doc = {
            toObject: () => ({ name: 'X', _id: 'abc', __v: 0 }),
        };
        expect(defaultToPlain(doc)).toEqual({ name: 'X' });
    });

    it('handles a doc that is already plain', () => {
        expect(defaultToPlain({ name: 'X', _id: 'abc', __v: 2 })).toEqual({ name: 'X' });
    });

    it('preserves nested objects', () => {
        const doc = { toObject: () => ({ name: 'X', design: { logo: { src: '/a' } } }) };
        expect(defaultToPlain(doc)).toEqual({ name: 'X', design: { logo: { src: '/a' } } });
    });
});

describe('coerceMissingGroups', () => {
    const fields: BridgeManifest['fields'] = [
        { name: 'name', type: 'text' },
        {
            name: 'i18n',
            type: 'group',
            fields: [{ name: 'defaultLocale', type: 'text' }],
        },
        {
            name: 'design',
            type: 'group',
            fields: [
                {
                    name: 'header',
                    type: 'group',
                    fields: [{ name: 'logo', type: 'group', fields: [{ name: 'src', type: 'text' }] }],
                },
            ],
        },
    ];

    it('backfills missing top-level groups with {}', () => {
        expect(coerceMissingGroups({ name: 'X' }, fields)).toEqual({
            name: 'X',
            i18n: {},
            design: { header: { logo: {} } },
        });
    });

    it('does not overwrite existing groups', () => {
        const input = { name: 'X', i18n: { defaultLocale: 'sv-SE' } };
        const result = coerceMissingGroups(input, fields);
        expect(result.i18n).toEqual({ defaultLocale: 'sv-SE' });
    });

    it('recurses into nested groups', () => {
        expect(coerceMissingGroups({ design: { header: {} } }, fields)).toMatchObject({
            design: { header: { logo: {} } },
        });
    });
});
