import { describe, expect, it } from 'vitest';
import { mediaEditor } from './media';

describe('mediaEditor', () => {
    it('targets the media collection', () => {
        expect(mediaEditor.collection).toBe('media');
    });
    it('is shared (admin-only)', () => {
        expect(mediaEditor.tenant.kind).toBe('shared');
    });
});
