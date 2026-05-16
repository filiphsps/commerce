import { describe, expect, it } from 'vitest';
import { UserSchema } from './user';

describe('models/user — groups field', () => {
    it('declares groups as an optional array of strings', () => {
        const path = UserSchema.path('groups');
        expect(path).toBeDefined();
        expect(path.instance).toBe('Array');
        expect(path.isRequired).toBeFalsy();
    });
});
