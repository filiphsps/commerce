import { describe, expect, it } from 'vitest';
import { BLOCK_DESCRIPTORS, blocksWithSettings } from './registry';

describe('block store-wide settings', () => {
    it('exposes the collection block defaultLayout as an overridable select', () => {
        const setting = BLOCK_DESCRIPTORS.collection.settings?.find(
            (field) => field.type === 'overridable' && field.name === 'defaultLayout',
        );
        expect(setting?.type).toBe('overridable');
        expect(setting?.type === 'overridable' ? setting.field.type : null).toBe('select');
    });

    it('lists only blocks that declare settings', () => {
        const slugs = blocksWithSettings().map((descriptor) => descriptor.slug);
        expect(slugs).toContain('collection');
        // A content-only block (no behavioral defaults) is omitted.
        expect(slugs).not.toContain('html');
    });
});
