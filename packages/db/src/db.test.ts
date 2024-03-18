import { describe, expect, it, vi } from 'vitest';

import { db } from './db';

describe('db', () => {
    it('should throw an error if MONGODB_URI environment variable is missing', async () => {
        vi.stubEnv('MONGODB_URI', '');

        await expect(db).rejects.toThrow();
    });
});
