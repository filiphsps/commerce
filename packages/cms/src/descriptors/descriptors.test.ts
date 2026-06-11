import { describe, expect, it } from 'vitest';
import {
    arrayField,
    block,
    blocksField,
    checkboxField,
    codeField,
    collapsibleField,
    condition,
    dateField,
    emailField,
    groupField,
    jsonField,
    localized,
    numberField,
    relationshipField,
    required,
    selectField,
    textareaField,
    textField,
    uploadField,
} from './index';

describe('descriptor field builders', () => {
    it('textField emits a text descriptor with hasMany support', () => {
        expect(textField({ name: 'title' })).toEqual({ type: 'text', name: 'title' });
        expect(textField({ name: 'keywords', hasMany: true })).toMatchObject({ type: 'text', hasMany: true });
    });

    it('textareaField emits a textarea descriptor', () => {
        expect(textareaField({ name: 'body' })).toEqual({ type: 'textarea', name: 'body' });
    });

    it('selectField emits a select descriptor carrying its options', () => {
        const cfg = selectField({
            name: 'kind',
            defaultValue: 'page',
            options: [
                { label: 'Page', value: 'page' },
                { label: 'External', value: 'external' },
            ],
        });
        expect(cfg.type).toBe('select');
        expect(cfg.defaultValue).toBe('page');
        expect(cfg.options.map((o) => o.value)).toEqual(['page', 'external']);
    });

    it('checkboxField emits a checkbox descriptor with a default', () => {
        expect(checkboxField({ name: 'noindex', defaultValue: false })).toMatchObject({
            type: 'checkbox',
            defaultValue: false,
        });
    });

    it('numberField emits a number descriptor', () => {
        expect(numberField({ name: 'columns', defaultValue: 3 })).toMatchObject({ type: 'number', defaultValue: 3 });
    });

    it('dateField emits a date descriptor', () => {
        expect(dateField({ name: 'publishedAt' })).toEqual({ type: 'date', name: 'publishedAt' });
    });

    it('emailField emits an email descriptor', () => {
        expect(emailField({ name: 'contact' })).toEqual({ type: 'email', name: 'contact' });
    });

    it('jsonField emits a json descriptor', () => {
        expect(jsonField({ name: 'metadata' })).toEqual({ type: 'json', name: 'metadata' });
    });

    it('codeField emits a code descriptor with a language hint', () => {
        expect(codeField({ name: 'snippet', language: 'html' })).toMatchObject({ type: 'code', language: 'html' });
    });

    it('relationshipField pins the literal target slug', () => {
        const cfg = relationshipField({ name: 'page', relationTo: 'pages' });
        expect(cfg).toMatchObject({ type: 'relationship', relationTo: 'pages' });
    });

    it('uploadField pins the literal target slug', () => {
        const cfg = uploadField({ name: 'image', relationTo: 'media' });
        expect(cfg).toMatchObject({ type: 'upload', relationTo: 'media' });
    });

    it('arrayField nests its child fields', () => {
        const cfg = arrayField({ name: 'items', fields: [textField({ name: 'label' })] });
        expect(cfg.type).toBe('array');
        expect(cfg.fields).toHaveLength(1);
        expect(cfg.fields[0]).toMatchObject({ type: 'text', name: 'label' });
    });

    it('groupField nests its child fields under a name', () => {
        const cfg = groupField({ name: 'seo', fields: [textField({ name: 'title' })] });
        expect(cfg.type).toBe('group');
        expect(cfg.name).toBe('seo');
    });

    it('blocksField carries block variants', () => {
        const cfg = blocksField({
            name: 'content',
            blocks: [block({ slug: 'banner', fields: [textField({ name: 'heading' })] })],
        });
        expect(cfg.type).toBe('blocks');
        expect(cfg.blocks[0]?.slug).toBe('banner');
    });

    it('collapsibleField is presentational — label, no name', () => {
        const cfg = collapsibleField({ label: 'Advanced', fields: [textField({ name: 'note' })] });
        expect(cfg.type).toBe('collapsible');
        expect(cfg.label).toBe('Advanced');
        expect('name' in cfg).toBe(false);
    });
});

describe('descriptor modifiers', () => {
    it('localized sets localized: true without mutating the input', () => {
        const base = textField({ name: 'title' });
        const result = localized(base);
        expect(result.localized).toBe(true);
        expect(base.localized).toBeUndefined();
    });

    it('rejects localized on composite kinds at the type level (G4FIX-03)', () => {
        // The compile-time half of the guard — the descriptor codegen throws
        // LocalizedCompositeFieldError for structurally-built schemas, and
        // these pins prove the builders cannot produce the silent class at all.
        // @ts-expect-error groups omit `localized` from their descriptor type
        const localizedGroup = groupField({ name: 'link', localized: true, fields: [] });
        // @ts-expect-error arrays omit `localized` from their descriptor type
        const localizedArray = arrayField({ name: 'rows', localized: true, fields: [] });
        // @ts-expect-error blocks omit `localized` from their descriptor type
        const localizedBlocks = blocksField({ name: 'content', localized: true, blocks: [] });
        // @ts-expect-error the localized() modifier only accepts leaf descriptors
        const wrappedGroup = localized(groupField({ name: 'seo', fields: [] }));
        // @ts-expect-error the localized() modifier only accepts leaf descriptors
        const wrappedArray = localized(arrayField({ name: 'items', fields: [] }));
        expect([localizedGroup, localizedArray, localizedBlocks, wrappedGroup, wrappedArray]).toHaveLength(5);
    });

    it('required sets required: true without mutating the input', () => {
        const base = uploadField({ name: 'cover', relationTo: 'media' });
        const result = required(base);
        expect(result.required).toBe(true);
        expect(base.required).toBeUndefined();
    });

    it('condition attaches a predicate under admin.condition', () => {
        const cfg = condition(textField({ name: 'url' }), (_data, sibling) => sibling.kind === 'external');
        expect(cfg.admin?.condition).toBeTypeOf('function');
        expect(cfg.admin?.condition?.({}, { kind: 'external' })).toBe(true);
        expect(cfg.admin?.condition?.({}, { kind: 'page' })).toBe(false);
    });

    it('condition preserves any pre-existing admin metadata', () => {
        const first = condition(textField({ name: 'url' }), () => true);
        const second = condition(first, (_data, sibling) => sibling.kind === 'anchor');
        expect(second.admin?.condition?.({}, { kind: 'anchor' })).toBe(true);
    });
});
