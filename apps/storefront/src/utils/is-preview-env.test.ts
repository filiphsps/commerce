import { describe, expect, it, vi } from 'vitest';

import { isPreviewEnv } from '@/utils/is-preview-env';

describe('utils', () => {
    describe('isPreviewEnv', () => {
        vi.mock('@/utils/build-config', () => ({
            BuildConfig: {
                environment: 'production'
            }
        }));

        it('should return `null` when no hostname is provided', () => {
            const result = isPreviewEnv();
            expect(result).toBeNull();
        });

        it('should return `null` when the hostname is empty', () => {
            const result = isPreviewEnv('');
            expect(result).toBeNull();
        });

        it('should return `null` when the hostname is invalid', () => {
            const result = isPreviewEnv([] as any);
            expect(result).toBeNull();
        });

        it('should return `true` when the hostname is a preview environment', () => {
            const result = isPreviewEnv('staging.example.com');
            expect(result).toBe(true);
        });

        it('should return `false` when the hostname is not a preview environment', () => {
            const result = isPreviewEnv('example.com');
            expect(result).toBe(false);
        });
    });
});
