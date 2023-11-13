import { ApiError } from '@/utils/errors';
import { describe, expect, it } from 'vitest';

describe('errors', () => {
    describe('ApiError', () => {
        it('should have a statusCode of 400', () => {
            const error = new ApiError();
            expect(error.statusCode).toBe(400);
        });
    });
});
