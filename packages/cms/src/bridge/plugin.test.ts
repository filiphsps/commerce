import type { Config } from 'payload';
import { describe, expect, it } from 'vitest';
import { type BridgeManifest, defineBridge } from './manifest';
import { buildBridgePlugin } from './plugin';

const noopAccess = () => true;
const noopAdapter = { findById: async () => null, update: async () => ({}) as never };

const widget: BridgeManifest = defineBridge({
    slug: 'widget',
    label: { singular: 'Widget', plural: 'Widgets' },
    fields: [{ name: 'name', type: 'text', required: true }],
    adapter: noopAdapter,
    access: { read: noopAccess, update: noopAccess },
});

const fakeConfig = (over: Partial<Config> = {}): Config =>
    ({
        collections: [],
        ...over,
    }) as Config;

describe('buildBridgePlugin', () => {
    it('exposes manifests under config.custom.bridges', async () => {
        const plugin = buildBridgePlugin([widget]);
        const result = await plugin(fakeConfig());
        expect(result.custom?.bridges).toEqual([widget]);
    });

    it('registers one hidden Payload collection per manifest with slug "bridge:<slug>"', async () => {
        const plugin = buildBridgePlugin([widget]);
        const result = await plugin(fakeConfig());
        const slugs = (result.collections ?? []).map((c) => c.slug);
        expect(slugs).toContain('bridge:widget');
    });

    it('locks CRUD access on synthesized collections', async () => {
        const plugin = buildBridgePlugin([widget]);
        const result = await plugin(fakeConfig());
        const c = (result.collections ?? []).find((c) => c.slug === 'bridge:widget');
        expect(c).toBeDefined();
        const access = c?.access;
        // biome-ignore lint/suspicious/noExplicitAny: access predicates take a runtime req object we don't have here
        expect((access?.read as any)?.()).toBe(false);
        // biome-ignore lint/suspicious/noExplicitAny: see above
        expect((access?.create as any)?.()).toBe(false);
        // biome-ignore lint/suspicious/noExplicitAny: see above
        expect((access?.update as any)?.()).toBe(false);
        // biome-ignore lint/suspicious/noExplicitAny: see above
        expect((access?.delete as any)?.()).toBe(false);
    });

    it('hides the synthesized collection from the admin sidebar', async () => {
        const plugin = buildBridgePlugin([widget]);
        const result = await plugin(fakeConfig());
        const c = (result.collections ?? []).find((c) => c.slug === 'bridge:widget');
        expect(c?.admin?.hidden).toBe(true);
    });

    it('throws at boot on duplicate manifest slugs', async () => {
        const plugin = buildBridgePlugin([widget, widget]);
        await expect(plugin(fakeConfig())).rejects.toThrow(/duplicate bridge slug: widget/i);
    });

    it('throws at boot on malformed fields', async () => {
        // biome-ignore lint/suspicious/noExplicitAny: deliberate invalid input
        const broken = defineBridge({ ...widget, fields: [{ type: 'text' } as any] });
        const plugin = buildBridgePlugin([broken]);
        await expect(plugin(fakeConfig())).rejects.toThrow(/missing `name`/i);
    });

    it('preserves existing collections', async () => {
        const existing = { slug: 'pages', fields: [] } as unknown as Config['collections'][number];
        const plugin = buildBridgePlugin([widget]);
        const result = await plugin(fakeConfig({ collections: [existing] }));
        const slugs = (result.collections ?? []).map((c) => c.slug);
        expect(slugs).toEqual(['pages', 'bridge:widget']);
    });
});
