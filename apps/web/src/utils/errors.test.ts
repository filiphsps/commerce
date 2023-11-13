import { ApiError } from '@/utils/errors';
import { describe, expect, it } from 'vitest';

describe('utils', () => {
    describe('errors', () => {
        describe('ApiError', () => {
            it('should have a statusCode of 400', () => {
                const error = new ApiError();
                expect(error.statusCode).toBe(400);
            });

            it('should have a getter for help documentation', () => {
                const error = new ApiError();
                expect(error.help).not.toBeUndefined();
                expect(error.help).not.toBeNull();
                expect(error.help.startsWith('https://shops.nordcom.io/docs/errors/')).toBe(true);
            });
        });
    });
});
