import type { Field } from 'payload';
import { describe, expect, it } from 'vitest';
import { media } from './media';

// Pure config introspection — no payload runtime needed. Booting a full Payload
// instance just to read back the same `media` config we ship is ~5–10s of test
// startup for assertions that are entirely derivable from the static export.
describe('media collection', () => {
    it('is configured with imageSizes', () => {
        const sizes = media.upload && typeof media.upload === 'object' ? (media.upload.imageSizes ?? []) : [];
        expect(sizes.map((s) => s.name)).toEqual(['thumbnail', 'card', 'feature', 'hero']);
    });

    it('alt text field is required', () => {
        const alt = (media.fields ?? []).find((f): f is Field & { name: string } => 'name' in f && f.name === 'alt');
        expect(alt).toBeDefined();
        expect((alt as { required?: boolean }).required).toBe(true);
    });
});
