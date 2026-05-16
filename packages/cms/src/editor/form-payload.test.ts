import type { Field } from 'payload';
import { describe, expect, it } from 'vitest';
import { parseFormPayload, pickByFieldNames } from './form-payload';

const fdWith = (entries: Record<string, string>): FormData => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(entries)) fd.append(k, v);
    return fd;
};

describe('parseFormPayload', () => {
    it('returns {} when _payload is absent', () => {
        expect(parseFormPayload(new FormData())).toEqual({});
    });

    it('parses JSON _payload', () => {
        const fd = fdWith({ _payload: JSON.stringify({ name: 'X', n: 1 }) });
        expect(parseFormPayload(fd)).toEqual({ name: 'X', n: 1 });
    });

    it('throws on malformed JSON', () => {
        const fd = fdWith({ _payload: 'not-json' });
        expect(() => parseFormPayload(fd)).toThrow(/malformed/i);
    });
});

describe('pickByFieldNames', () => {
    const fields: Field[] = [
        { name: 'name', type: 'text' },
        { name: 'domain', type: 'text' },
        { name: 'design', type: 'group', fields: [{ name: 'logo', type: 'text' }] },
    ];

    it('keeps declared top-level fields', () => {
        expect(pickByFieldNames({ name: 'X', domain: 'a.test' }, fields)).toEqual({ name: 'X', domain: 'a.test' });
    });

    it('drops undeclared top-level keys', () => {
        expect(pickByFieldNames({ name: 'X', injected: 'evil' }, fields)).toEqual({ name: 'X' });
    });

    it('passes group payloads through untouched (nested scrubbing is the validator’s job)', () => {
        expect(pickByFieldNames({ design: { logo: '/a', extra: 'keep' } }, fields)).toEqual({
            design: { logo: '/a', extra: 'keep' },
        });
    });
});
