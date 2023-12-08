import { isValidHandle } from '@/utils/handle';
import { describe, expect, it } from 'vitest';

describe('utils', () => {
    describe('isValidHandle', () => {
        it(`should return false when handle is null`, () => {
            const handle = null;
            const result = isValidHandle(handle);

            expect(result).toBe(false);
        });

        it(`should return false when handle is undefined`, () => {
            const handle = undefined;
            const result = isValidHandle(handle);

            expect(result).toBe(false);
        });

        it(`should return false when handle is not a string`, () => {
            const handle = 123;
            const result = isValidHandle(handle);

            expect(result).toBe(false);
        });

        it(`should return false when handle is an empty string`, () => {
            const handle = '';
            const result = isValidHandle(handle);

            expect(result).toBe(false);
        });

        it(`should return false when handle is '[handle]'`, () => {
            const handle = '[handle]';
            const result = isValidHandle(handle);

            expect(result).toBe(false);
        });

        it(`should return false when handle is '[[...uid]]'`, () => {
            const handle = '[[...uid]]';
            const result = isValidHandle(handle);

            expect(result).toBe(false);
        });

        it(`should return true when handle is a valid string`, () => {
            const handle = 'my-handle';
            const result = isValidHandle(handle);

            expect(result).toBe(true);
        });
    });
});
