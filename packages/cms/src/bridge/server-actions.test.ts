import type { Field } from 'payload';
import { describe, expect, it, vi } from 'vitest';
import { type BridgeManifest, defineBridge } from './manifest';
import { createBridgeServerActions, parseFormPayload, pickByFieldNames } from './server-actions';

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

const buildManifest = (overrides: Partial<BridgeManifest> = {}): BridgeManifest =>
    defineBridge({
        slug: 'widget',
        label: { singular: 'Widget', plural: 'Widgets' },
        fields: [
            { name: 'name', type: 'text' },
            { name: 'domain', type: 'text' },
        ],
        adapter: {
            findById: vi.fn(async () => ({ name: 'A' })),
            update: vi.fn(async (_id: string, patch: Record<string, unknown>) => ({ name: 'A', ...patch }) as never),
            delete: vi.fn(async () => undefined),
        },
        access: {
            read: vi.fn(async () => true),
            update: vi.fn(async () => true),
            delete: vi.fn(async () => true),
        },
        ...overrides,
    });

describe('createBridgeServerActions.updateAction', () => {
    it('calls adapter.update with allowlist-filtered patch', async () => {
        const manifest = buildManifest();
        const ctx = { user: { id: 'u', role: 'admin' as const, tenants: ['a.test'] }, domain: 'a.test' };
        const actions = createBridgeServerActions(manifest, async () => ctx);

        const fd = new FormData();
        fd.append('_payload', JSON.stringify({ name: 'B', extra: 'drop' }));
        await actions.updateAction('a.test', 'id-1', fd);

        expect(manifest.adapter.update).toHaveBeenCalledWith('id-1', { name: 'B' });
    });

    it('throws notFound-shaped error when access denied', async () => {
        const access = { read: async () => true, update: async () => false, delete: async () => true };
        const manifest = buildManifest({ access });
        const ctx = { user: { id: 'u', role: 'editor' as const }, domain: 'a.test' };
        const actions = createBridgeServerActions(manifest, async () => ctx);

        const fd = new FormData();
        fd.append('_payload', JSON.stringify({ name: 'B' }));
        await expect(actions.updateAction('a.test', 'id-1', fd)).rejects.toThrow(/access denied/i);
        expect(manifest.adapter.update).not.toHaveBeenCalled();
    });

    it('applies fromFormValues projection when provided', async () => {
        const fromFormValues = vi.fn((v: Record<string, unknown>) => ({ rewritten: v.name }));
        const manifest = buildManifest({ fromFormValues: fromFormValues as never });
        const ctx = { user: { id: 'u', role: 'admin' as const }, domain: 'a.test' };
        const actions = createBridgeServerActions(manifest, async () => ctx);

        const fd = new FormData();
        fd.append('_payload', JSON.stringify({ name: 'B' }));
        await actions.updateAction('a.test', 'id-1', fd);

        expect(fromFormValues).toHaveBeenCalledWith({ name: 'B' });
        expect(manifest.adapter.update).toHaveBeenCalledWith('id-1', { rewritten: 'B' });
    });
});

describe('createBridgeServerActions.deleteAction', () => {
    it('calls adapter.delete when access passes', async () => {
        const manifest = buildManifest();
        const ctx = { user: { id: 'u', role: 'admin' as const }, domain: 'a.test' };
        const actions = createBridgeServerActions(manifest, async () => ctx);
        await actions.deleteAction('a.test', 'id-1');
        expect(manifest.adapter.delete).toHaveBeenCalledWith('id-1');
    });

    it('throws when delete access is missing on the manifest', async () => {
        const manifest = buildManifest({ access: { read: async () => true, update: async () => true } });
        const ctx = { user: { id: 'u', role: 'admin' as const }, domain: 'a.test' };
        const actions = createBridgeServerActions(manifest, async () => ctx);
        await expect(actions.deleteAction('a.test', 'id-1')).rejects.toThrow(/delete not configured/i);
    });
});
