import { describe, expect, it } from 'vitest';

import { isCrawler } from '@/utils/is-crawler';

describe('utils', () => {
    describe('isCrawler', () => {
        it('should return `null` when no user agent is provided', () => {
            const result = isCrawler();
            expect(result).toBeNull();
        });

        it('should return `null` when the user agent is empty', () => {
            const result = isCrawler('');
            expect(result).toBeNull();
        });

        it('should return `null` when the user agent is invalid', () => {
            const result = isCrawler([] as any);
            expect(result).toBeNull();
        });

        it('should return `true` when the user agent is a crawler', () => {
            const result = isCrawler('Googlebot');
            expect(result).toBe(true);
        });

        it('should return `false` when the user agent is not a crawler', () => {
            const result = isCrawler(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36'
            );
            expect(result).toBe(false);
        });
    });
});
