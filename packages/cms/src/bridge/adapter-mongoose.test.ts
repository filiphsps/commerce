import { db } from '@nordcom/commerce-db';
import { Schema } from 'mongoose';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { coerceMissingGroups, defaultToPlain, mongooseAdapter } from './adapter-mongoose';
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

const widgetSchema = new Schema(
    {
        name: { type: String, required: true },
        domain: { type: String, required: true, unique: true },
        secret: { type: String, required: false },
    },
    { id: true, timestamps: true },
);
const WidgetModel = db.models.Widget || db.model('Widget', widgetSchema);

const cleanup = async () => {
    await WidgetModel.deleteMany({}).exec();
};

describe('mongooseAdapter', () => {
    beforeEach(cleanup);
    afterAll(cleanup);

    it('findById by _id returns plain object without _id/__v', async () => {
        const created = await WidgetModel.create({ name: 'A', domain: 'a.test' });
        if (!created) throw new Error('test setup: Widget.create returned null');
        const adapter = mongooseAdapter(WidgetModel);
        const found = await adapter.findById(String(created._id));
        expect(found).toEqual(expect.objectContaining({ name: 'A', domain: 'a.test' }));
        expect(found).not.toHaveProperty('_id');
        expect(found).not.toHaveProperty('__v');
    });

    it('findById by alternative idKey works', async () => {
        await WidgetModel.create({ name: 'A', domain: 'a.test' });
        const adapter = mongooseAdapter(WidgetModel, { idKey: 'domain' });
        const found = await adapter.findById('a.test');
        expect((found as { name: string }).name).toBe('A');
    });

    it('findById returns null when missing', async () => {
        const adapter = mongooseAdapter(WidgetModel, { idKey: 'domain' });
        expect(await adapter.findById('missing.test')).toBeNull();
    });

    it('update writes the patch and returns the updated doc', async () => {
        const created = await WidgetModel.create({ name: 'A', domain: 'a.test' });
        if (!created) throw new Error('test setup: Widget.create returned null');
        const adapter = mongooseAdapter(WidgetModel);
        const updated = await adapter.update(String(created._id), { name: 'B' });
        expect((updated as { name: string }).name).toBe('B');
        const reread = await adapter.findById(String(created._id));
        expect((reread as { name: string } | null)?.name).toBe('B');
    });

    it('update runs Mongoose validators (rejects required:true violation)', async () => {
        const created = await WidgetModel.create({ name: 'A', domain: 'a.test' });
        if (!created) throw new Error('test setup: Widget.create returned null');
        const adapter = mongooseAdapter(WidgetModel);
        await expect(adapter.update(String(created._id), { name: '' })).rejects.toThrow();
    });

    it('update throws when the document is missing', async () => {
        const adapter = mongooseAdapter(WidgetModel);
        await expect(adapter.update('507f1f77bcf86cd799439011', { name: 'X' })).rejects.toThrow(/no Widget/);
    });

    it('redact strips listed paths from findById results', async () => {
        await WidgetModel.create({ name: 'A', domain: 'a.test', secret: 'shh' });
        const adapter = mongooseAdapter(WidgetModel, {
            idKey: 'domain',
            redact: (doc: Record<string, unknown>) => {
                const { secret: _s, ...rest } = doc;
                return rest;
            },
        });
        const found = await adapter.findById('a.test');
        expect(found).not.toHaveProperty('secret');
    });

    it('delete removes the document', async () => {
        const created = await WidgetModel.create({ name: 'A', domain: 'a.test' });
        if (!created) throw new Error('test setup: Widget.create returned null');
        const adapter = mongooseAdapter(WidgetModel);
        await adapter.delete!(String(created._id));
        expect(await adapter.findById(String(created._id))).toBeNull();
    });
});
