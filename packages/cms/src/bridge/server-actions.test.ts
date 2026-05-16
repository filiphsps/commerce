import type { Field } from 'payload';
import { describe, expect, it } from 'vitest';
import { parseFormPayload, pickByFieldNames } from './server-actions';

const formDataWith = (entries: Record<string, string>): FormData => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(entries)) fd.append(k, v);
    return fd;
};

describe('parseFormPayload', () => {
    it('returns {} when _payload is absent', () => {
        expect(parseFormPayload(new FormData())).toEqual({});
    });

    it('parses JSON _payload', () => {
        const fd = formDataWith({ _payload: JSON.stringify({ name: 'X', alt: 12 }) });
        expect(parseFormPayload(fd)).toEqual({ name: 'X', alt: 12 });
    });

    it('throws on malformed JSON', () => {
        const fd = formDataWith({ _payload: 'not-json' });
        expect(() => parseFormPayload(fd)).toThrow(/malformed/i);
    });
});

describe('pickByFieldNames', () => {
    const fields: Field[] = [
        { name: 'name', type: 'text' },
        { name: 'domain', type: 'text' },
        { name: 'design', type: 'group', fields: [{ name: 'logoSrc', type: 'text' }] },
    ];

    it('keeps declared fields', () => {
        expect(pickByFieldNames({ name: 'X', domain: 'a.test' }, fields)).toEqual({ name: 'X', domain: 'a.test' });
    });

    it('drops undeclared fields', () => {
        expect(pickByFieldNames({ name: 'X', injected: 'evil' }, fields)).toEqual({ name: 'X' });
    });

    it('keeps top-level group payloads as-is (nested fields trusted to the adapter)', () => {
        const input = { design: { logoSrc: '/a', notDeclared: 'shouldStay' } };
        expect(pickByFieldNames(input, fields)).toEqual({ design: { logoSrc: '/a', notDeclared: 'shouldStay' } });
    });
});
