import { describe, expect, it } from 'vitest';

import { GenericErrorKind, getErrorFromCode, MissingSessionUserIdError } from './index';

describe('MissingSessionUserIdError', () => {
    it('has the expected shape', () => {
        // Note: identity is established via `name` + `code` rather than
        // `instanceof` or `.constructor`, because the base `Error` class
        // calls `Object.setPrototypeOf(this, Error.prototype)` in its
        // constructor, which collapses the subclass prototype chain.
        // The package's own `Error.is()` follows the same pattern (it
        // compares `code`, not `instanceof`).
        const err = new MissingSessionUserIdError();
        expect(err.name).toBe('MissingSessionUserIdError');
        expect(err.statusCode).toBe(500);
        expect(err.code).toBe(GenericErrorKind.MISSING_SESSION_USER_ID);
        expect(typeof err.description).toBe('string');
        expect(err.description.length).toBeGreaterThan(0);
    });

    it('is reachable through getErrorFromCode', () => {
        const Cls = getErrorFromCode(GenericErrorKind.MISSING_SESSION_USER_ID);
        expect(Cls).toBe(MissingSessionUserIdError);
    });
});
