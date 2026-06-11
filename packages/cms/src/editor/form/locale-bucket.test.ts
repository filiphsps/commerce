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

    it('rejects the {alt,src} and {id,url} content shapes the all-short-lowercase heuristic ate (G4FIX-02)', () => {
        // The exact false-positive class from the G4 verification: every key is
        // 2-3 lowercase letters, but `alt`/`src`/`url` are not locale codes.
        expect(isLocaleBucketValue({ alt: 'Logo', src: '/logo.png' })).toBe(false);
        expect(isLocaleBucketValue({ id: 'media_1', url: '/m/logo.png' })).toBe(false);
    });

    it('accepts only registered bare codes alongside the BCP-47 region grammar', () => {
        // A region-tagged pair outside the curated list still counts (the grammar
        // is unambiguous), but bare keys must be registered ISO 639-1 codes.
        expect(isLocaleBucketValue({ 'en-FI': 'Hello', 'sv-AX': 'Hej' })).toBe(true);
        expect(isLocaleBucketValue({ foo: 'x', bar: 'y' })).toBe(false);
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

    it('round-trips a slot whose CONTENT is itself locale-shaped (pathological nesting, G4FIX-02)', () => {
        const nested = { en: 'inner-en', sv: 'inner-sv' };
        const bucket = writeLocaleSlot(undefined, 'en-US', nested, 'en-US');
        expect(bucket).toEqual({ 'en-US': nested });
        // The wrapped bucket reads its slot back byte-identical — the inner
        // locale-shaped content is plain content, never re-collapsed…
        expect(readLocaleSlot(bucket, 'en-US', 'en-US')).toEqual(nested);
        // …and the bucket is recognized as one, never double-wrapped.
        expect(toLocaleBucket(bucket, 'en-US')).toBe(bucket);
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
