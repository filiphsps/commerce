import { describe, expect, it } from 'vitest';
import { COMPONENT_SETTINGS, componentSettingsById } from './component-settings';

describe('component settings registry', () => {
    it('declares product card with its surfaces and overridable settings', () => {
        const pc = componentSettingsById('productCard');
        expect(pc?.surfaces).toEqual(['collection', 'search', 'recommendation']);
        const cta = pc?.settings.find((field) => field.name === 'ctaPlacement');
        expect(cta?.type).toBe('overridable');
        expect(cta?.field.type).toBe('select');
        // productCard is multi-scope (store-wide `base` + per-surface), so the inherit label must NOT
        // hardcode a single source: "Platform default" would lie in a surface scope that actually
        // inherits the `base` value. Left generic ("Inherited"). See docs/adr/0004.
        expect(cta?.inheritedSourceLabel).toBeUndefined();
    });

    it('exposes every setting as an overridable descriptor', () => {
        for (const entry of COMPONENT_SETTINGS) {
            for (const setting of entry.settings) {
                expect(setting.type).toBe('overridable');
            }
        }
    });

    it('returns undefined for an unknown component id', () => {
        expect(componentSettingsById('nope')).toBeUndefined();
    });
});
