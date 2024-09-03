import { describe, expect, it } from 'vitest';

import { isPreviewEnvironment } from '@/components/toolbars';

describe('components', () => {
    describe('Toolbars', () => {
        it('should return true for preview environments', () => {
            expect(isPreviewEnvironment('staging.example.com')).toBe(true);
            expect(isPreviewEnvironment('preview.example.com')).toBe(true);
            expect(isPreviewEnvironment('beta.example.com')).toBe(true);
            expect(isPreviewEnvironment('localhost')).toBe(true);
        });

        it('should return false for non-preview environments', () => {
            expect(isPreviewEnvironment('example.com')).toBe(false);
            expect(isPreviewEnvironment('www.example.com')).toBe(false);
            expect(isPreviewEnvironment('production.example.com')).toBe(false);
        });
    });
});
