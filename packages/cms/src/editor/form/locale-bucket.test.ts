import { describe, expect, it } from 'vitest';

import { isLocaleBucketValue, readLocaleSlot, toLocaleBucket, writeLocaleSlot } from './locale-bucket';
import { buildInitialFormState, reduceFieldsToValues } from './state';

describe('isLocaleBucketValue', () => {
    it('accepts a multi-locale bucket and a region-tagged single-slot bucket', () => {
        expect(isLocaleBucketValue({ 'en-US': 'Hello', 'de-DE': 'Hallo' })).toBe(true);
        expect(isLocaleBucketValue({ 'en-US': 'Hello' })).toBe(true);
        expect(isLocaleBucketValue({ en: 'Hello', de: 'Hallo' })).toBe(true);
    });

    it('rejects content objects whose keys merely look locale-ish', () => {
        // `id` is the ISO 639-1 code for Indonesian and `url` is three lowercase
        // letters — single bare-code keys must NOT count as buckets.
        expect(isLocaleBucketValue({ id: 'doc_1' })).toBe(false);
        expect(isLocaleBucketValue({ url: '/x/' })).toBe(false);
        expect(isLocaleBucketValue({ kind: 'external', url: '/x/' })).toBe(false);
        expect(isLocaleBucketValue({})).toBe(false);
        expect(isLocaleBucketValue(['en-US'])).toBe(false);
        expect(isLocaleBucketValue('en-US')).toBe(false);
        expect(isLocaleBucketValue(null)).toBe(false);
    });
});

describe('toLocaleBucket', () => {
    it('passes a bucket through untouched and never mutates it', () => {
        const bucket = { 'en-US': 'Hello' };
        expect(toLocaleBucket(bucket, 'de-DE')).toBe(bucket);
    });

    it('attributes a legacy plain value to the default locale', () => {
        expect(toLocaleBucket('Region', 'sv-SE')).toEqual({ 'sv-SE': 'Region' });
    });

    it('treats absent values as an empty bucket', () => {
        expect(toLocaleBucket(undefined, 'en-US')).toEqual({});
        expect(toLocaleBucket(null, 'en-US')).toEqual({});
    });
});

describe('readLocaleSlot / writeLocaleSlot', () => {
    it('reads strictly — an unset locale never falls back to another slot', () => {
        expect(readLocaleSlot({ 'en-US': 'Region' }, 'de-DE', 'en-US')).toBeUndefined();
        expect(readLocaleSlot({ 'en-US': 'Region' }, 'en-US', 'en-US')).toBe('Region');
        expect(readLocaleSlot('Region', 'en-US', 'en-US')).toBe('Region');
        expect(readLocaleSlot('Region', 'de-DE', 'en-US')).toBeUndefined();
    });

    it('writes only the active slot and keeps every other locale byte-identical', () => {
        const original = { 'en-US': 'Region', 'sv-SE': 'Plats' };
        const next = writeLocaleSlot(original, 'de-DE', 'Standort', 'en-US');
        expect(next).toEqual({ 'en-US': 'Region', 'sv-SE': 'Plats', 'de-DE': 'Standort' });
        expect(original).toEqual({ 'en-US': 'Region', 'sv-SE': 'Plats' });
    });

    it('upgrades a legacy plain value into the default slot before writing locale B', () => {
        expect(writeLocaleSlot('Region', 'de-DE', 'Standort', 'en-US')).toEqual({
            'en-US': 'Region',
            'de-DE': 'Standort',
        });
    });
});

describe('form-state round-trip with buckets', () => {
    it('keeps a locale bucket as a single leaf through flatten + reduce', () => {
        const data = {
            localeSwitcher: { enabled: true, label: { 'en-US': 'Region', 'de-DE': 'Standort' } },
            items: [{ description: { 'en-US': 'Copy' }, backgroundColor: '#000' }],
        };
        const state = buildInitialFormState(data);

        expect(state['localeSwitcher.label']?.value).toEqual({ 'en-US': 'Region', 'de-DE': 'Standort' });
        expect(state['localeSwitcher.label.en-US']).toBeUndefined();
        expect(state['items.0.description']?.value).toEqual({ 'en-US': 'Copy' });

        expect(reduceFieldsToValues(state)).toEqual(data);
    });

    it('still flattens ordinary nested objects into dotted leaves', () => {
        const state = buildInitialFormState({ seo: { title: 'T', description: 'D' } });
        expect(state['seo.title']?.value).toBe('T');
        expect(state.seo).toBeUndefined();
    });
});
