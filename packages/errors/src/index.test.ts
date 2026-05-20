import { describe, expect, it } from 'vitest';

import {
    ApiErrorKind,
    EmptyUploadFileError,
    GenericErrorKind,
    getErrorFromCode,
    MalformedFormPayloadError,
    MissingRequiredFieldError,
    MissingSessionUserIdError,
    MissingUploadFileError,
    NoLocaleResolvableError,
    ShopMisconfigurationError,
    UnknownCollectionSlugError,
    UnknownShopIdError,
} from './index';

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

describe('UnknownShopIdError', () => {
    it('has the expected shape (no args)', () => {
        const err = new UnknownShopIdError();
        expect(err.name).toBe('UnknownShopIdError');
        expect(err.statusCode).toBe(404);
        expect(err.code).toBe(ApiErrorKind.API_UNKNOWN_SHOP_ID);
        expect(err.description).toContain('id');
    });
    it('templates id into description', () => {
        const err = new UnknownShopIdError('abc123');
        expect(err.description).toContain('"abc123"');
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(ApiErrorKind.API_UNKNOWN_SHOP_ID)).toBe(UnknownShopIdError);
    });
});

describe('ShopMisconfigurationError', () => {
    it('has the expected shape (no args)', () => {
        const err = new ShopMisconfigurationError();
        expect(err.name).toBe('ShopMisconfigurationError');
        expect(err.statusCode).toBe(500);
        expect(err.code).toBe(ApiErrorKind.API_SHOP_MISCONFIGURATION);
    });
    it('templates domain and missing fields into description', () => {
        const err = new ShopMisconfigurationError('forge.shop', ['authentication.token', 'domain']);
        expect(err.description).toContain('"forge.shop"');
        expect(err.description).toContain('authentication.token');
        expect(err.description).toContain('domain');
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(ApiErrorKind.API_SHOP_MISCONFIGURATION)).toBe(ShopMisconfigurationError);
    });
});

describe('MalformedFormPayloadError', () => {
    it('has the expected shape (no args)', () => {
        const err = new MalformedFormPayloadError();
        expect(err.name).toBe('MalformedFormPayloadError');
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe(ApiErrorKind.API_MALFORMED_FORM_PAYLOAD);
    });
    it('captures Error cause as a message string', () => {
        const underlying = new globalThis.Error('Unexpected token');
        const err = new MalformedFormPayloadError(underlying);
        expect(err.cause).toBe('Unexpected token');
    });
    it('captures non-Error cause as String()', () => {
        const err = new MalformedFormPayloadError({ foo: 'bar' });
        expect(typeof err.cause).toBe('string');
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(ApiErrorKind.API_MALFORMED_FORM_PAYLOAD)).toBe(MalformedFormPayloadError);
    });
});

describe('UnknownCollectionSlugError', () => {
    it('has the expected shape (no args)', () => {
        const err = new UnknownCollectionSlugError();
        expect(err.name).toBe('UnknownCollectionSlugError');
        expect(err.statusCode).toBe(500);
        expect(err.code).toBe(ApiErrorKind.API_UNKNOWN_COLLECTION_SLUG);
    });
    it('templates slug into description', () => {
        const err = new UnknownCollectionSlugError('shops');
        expect(err.description).toContain('"shops"');
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(ApiErrorKind.API_UNKNOWN_COLLECTION_SLUG)).toBe(UnknownCollectionSlugError);
    });
});

describe('NoLocaleResolvableError', () => {
    it('has the expected shape (no args)', () => {
        const err = new NoLocaleResolvableError();
        expect(err.name).toBe('NoLocaleResolvableError');
        expect(err.statusCode).toBe(500);
        expect(err.code).toBe(ApiErrorKind.API_NO_LOCALE_RESOLVABLE);
    });
    it('templates url into description', () => {
        const err = new NoLocaleResolvableError('https://forge.shop/x');
        expect(err.description).toContain('"https://forge.shop/x"');
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(ApiErrorKind.API_NO_LOCALE_RESOLVABLE)).toBe(NoLocaleResolvableError);
    });
});

describe('MissingUploadFileError', () => {
    it('has the expected shape', () => {
        const err = new MissingUploadFileError();
        expect(err.name).toBe('MissingUploadFileError');
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe(ApiErrorKind.API_MISSING_UPLOAD_FILE);
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(ApiErrorKind.API_MISSING_UPLOAD_FILE)).toBe(MissingUploadFileError);
    });
});

describe('EmptyUploadFileError', () => {
    it('has the expected shape', () => {
        const err = new EmptyUploadFileError();
        expect(err.name).toBe('EmptyUploadFileError');
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe(ApiErrorKind.API_EMPTY_UPLOAD_FILE);
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(ApiErrorKind.API_EMPTY_UPLOAD_FILE)).toBe(EmptyUploadFileError);
    });
});

describe('MissingRequiredFieldError', () => {
    it('has the expected shape (no args)', () => {
        const err = new MissingRequiredFieldError();
        expect(err.name).toBe('MissingRequiredFieldError');
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe(ApiErrorKind.API_MISSING_REQUIRED_FIELD);
    });
    it('templates field name into description', () => {
        const err = new MissingRequiredFieldError('alt');
        expect(err.description).toContain('"alt"');
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(ApiErrorKind.API_MISSING_REQUIRED_FIELD)).toBe(MissingRequiredFieldError);
    });
});
