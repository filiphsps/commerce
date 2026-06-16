import { describe, expect, it } from 'vitest';

import {
    ApiErrorKind,
    Error as CommerceError,
    DomainVerificationError,
    DuplicatePredicateRegistrationError,
    DuplicateWorkspaceSlugError,
    EmptyTenantScopeError,
    EmptyUploadFileError,
    ERROR_KINDS,
    GenericErrorKind,
    getAllErrorCodes,
    getErrorFromCode,
    MalformedFormPayloadError,
    MediaStorageUploadError,
    MissingConvexBridgeError,
    MissingEnvironmentVariableError,
    MissingListConfigError,
    MissingRequestContextError,
    MissingRequiredFieldError,
    MissingSessionUserIdError,
    MissingTenantForScopedCollectionError,
    MissingTypeDocOutputError,
    MissingUploadFileError,
    NoLocaleResolvableError,
    NotFoundError,
    ShopMisconfigurationError,
    TodoError,
    UnknownCollectionSlugError,
    UnknownShopDomainError,
    UnknownShopIdError,
    UnsupportedUploadMimeTypeError,
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

describe('UnsupportedUploadMimeTypeError', () => {
    it('has the expected shape (no args)', () => {
        const err = new UnsupportedUploadMimeTypeError();
        expect(err.name).toBe('UnsupportedUploadMimeTypeError');
        expect(err.statusCode).toBe(415);
        expect(err.code).toBe(ApiErrorKind.API_UNSUPPORTED_UPLOAD_MIME_TYPE);
    });
    it('templates mime type into description', () => {
        const err = new UnsupportedUploadMimeTypeError('text/html');
        expect(err.description).toContain('"text/html"');
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(ApiErrorKind.API_UNSUPPORTED_UPLOAD_MIME_TYPE)).toBe(UnsupportedUploadMimeTypeError);
    });
});

describe('MediaStorageUploadError', () => {
    it('has the expected shape (no args)', () => {
        const err = new MediaStorageUploadError();
        expect(err.name).toBe('MediaStorageUploadError');
        expect(err.statusCode).toBe(502);
        expect(err.code).toBe(ApiErrorKind.API_MEDIA_STORAGE_UPLOAD_FAILED);
    });
    it('templates the byte-sink status into description', () => {
        const err = new MediaStorageUploadError(503);
        expect(err.description).toContain('503');
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(ApiErrorKind.API_MEDIA_STORAGE_UPLOAD_FAILED)).toBe(MediaStorageUploadError);
    });
});

describe('MissingTenantForScopedCollectionError', () => {
    it('has the expected shape (no args)', () => {
        const err = new MissingTenantForScopedCollectionError();
        expect(err.name).toBe('MissingTenantForScopedCollectionError');
        expect(err.code).toBe(GenericErrorKind.GENERIC_MISSING_TENANT_FOR_SCOPED_COLLECTION);
    });
    it('templates collection into description', () => {
        const err = new MissingTenantForScopedCollectionError('media');
        expect(err.description).toContain('"media"');
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(GenericErrorKind.GENERIC_MISSING_TENANT_FOR_SCOPED_COLLECTION)).toBe(
            MissingTenantForScopedCollectionError,
        );
    });
});

describe('EmptyTenantScopeError', () => {
    it('has the expected shape', () => {
        const err = new EmptyTenantScopeError();
        expect(err.name).toBe('EmptyTenantScopeError');
        expect(err.code).toBe(GenericErrorKind.GENERIC_EMPTY_TENANT_SCOPE);
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(GenericErrorKind.GENERIC_EMPTY_TENANT_SCOPE)).toBe(EmptyTenantScopeError);
    });
});

describe('MissingListConfigError', () => {
    it('has the expected shape (no args)', () => {
        const err = new MissingListConfigError();
        expect(err.name).toBe('MissingListConfigError');
        expect(err.code).toBe(GenericErrorKind.GENERIC_MISSING_LIST_CONFIG);
    });
    it('templates collection into description', () => {
        const err = new MissingListConfigError('reviews');
        expect(err.description).toContain('"reviews"');
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(GenericErrorKind.GENERIC_MISSING_LIST_CONFIG)).toBe(MissingListConfigError);
    });
});

describe('MissingConvexBridgeError', () => {
    it('has the expected shape (no args)', () => {
        const err = new MissingConvexBridgeError();
        expect(err.name).toBe('MissingConvexBridgeError');
        expect(err.code).toBe(GenericErrorKind.GENERIC_MISSING_CONVEX_BRIDGE);
    });
    it('templates collection into description', () => {
        const err = new MissingConvexBridgeError('pages');
        expect(err.description).toContain('"pages"');
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(GenericErrorKind.GENERIC_MISSING_CONVEX_BRIDGE)).toBe(MissingConvexBridgeError);
    });
});

describe('DuplicatePredicateRegistrationError', () => {
    it('has the expected shape (no args)', () => {
        const err = new DuplicatePredicateRegistrationError();
        expect(err.name).toBe('DuplicatePredicateRegistrationError');
        expect(err.code).toBe(GenericErrorKind.GENERIC_DUPLICATE_PREDICATE_REGISTRATION);
    });
    it('templates predicate name into description', () => {
        const err = new DuplicatePredicateRegistrationError('isPro');
        expect(err.description).toContain('"isPro"');
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(GenericErrorKind.GENERIC_DUPLICATE_PREDICATE_REGISTRATION)).toBe(
            DuplicatePredicateRegistrationError,
        );
    });
});

describe('MissingRequestContextError', () => {
    it('has the expected shape', () => {
        const err = new MissingRequestContextError();
        expect(err.name).toBe('MissingRequestContextError');
        expect(err.code).toBe(GenericErrorKind.GENERIC_MISSING_REQUEST_CONTEXT);
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(GenericErrorKind.GENERIC_MISSING_REQUEST_CONTEXT)).toBe(MissingRequestContextError);
    });
});

describe('DuplicateWorkspaceSlugError', () => {
    it('has the expected shape (no args)', () => {
        const err = new DuplicateWorkspaceSlugError();
        expect(err.name).toBe('DuplicateWorkspaceSlugError');
        expect(err.code).toBe(GenericErrorKind.GENERIC_DUPLICATE_WORKSPACE_SLUG);
    });
    it('templates slug into description', () => {
        const err = new DuplicateWorkspaceSlugError('admin');
        expect(err.description).toContain('"admin"');
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(GenericErrorKind.GENERIC_DUPLICATE_WORKSPACE_SLUG)).toBe(DuplicateWorkspaceSlugError);
    });
});

describe('MissingTypeDocOutputError', () => {
    it('has the expected shape (no args)', () => {
        const err = new MissingTypeDocOutputError();
        expect(err.name).toBe('MissingTypeDocOutputError');
        expect(err.code).toBe(GenericErrorKind.GENERIC_MISSING_TYPEDOC_OUTPUT);
    });
    it('templates subpath, rootDir, and buildCommand into description', () => {
        const err = new MissingTypeDocOutputError('docs', '.typedoc-out', 'pnpm pre:typedoc');
        expect(err.description).toContain('"docs"');
        expect(err.description).toContain('".typedoc-out"');
        expect(err.description).toContain('`pnpm pre:typedoc`');
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(GenericErrorKind.GENERIC_MISSING_TYPEDOC_OUTPUT)).toBe(MissingTypeDocOutputError);
    });
});

describe('MissingEnvironmentVariableError', () => {
    it('has the expected shape (no args)', () => {
        const err = new MissingEnvironmentVariableError();
        expect(err.name).toBe('MissingEnvironmentVariableError');
        expect(err.statusCode).toBe(500);
        expect(err.code).toBe(ApiErrorKind.API_MISSING_ENVIRONMENT_VARIABLE);
        expect(err.description.length).toBeGreaterThan(0);
    });
    it('templates variable name into description', () => {
        const err = new MissingEnvironmentVariableError('NEXT_PUBLIC_DOCS_CANONICAL_URL');
        expect(err.description).toContain('"NEXT_PUBLIC_DOCS_CANONICAL_URL"');
    });
    it('appends hint when provided', () => {
        const err = new MissingEnvironmentVariableError('PAYLOAD_SECRET', 'Set it in your deploy environment.');
        expect(err.description).toContain('"PAYLOAD_SECRET"');
        expect(err.description).toContain('Set it in your deploy environment.');
    });
    it('accepts cause and statusCode positionally', () => {
        const err = new MissingEnvironmentVariableError('FOO', undefined, 'boot', 503);
        expect(err.cause).toBe('boot');
        expect(err.statusCode).toBe(503);
    });
});

describe('UnknownShopDomainError', () => {
    it('has the expected shape (no args)', () => {
        const err = new UnknownShopDomainError();
        expect(err.name).toBe('UnknownShopDomainError');
        expect(err.statusCode).toBe(404);
        expect(err.code).toBe(ApiErrorKind.API_UNKNOWN_SHOP_DOMAIN);
    });
    it('templates domain into description', () => {
        const err = new UnknownShopDomainError('forge.shop');
        expect(err.description).toContain('"forge.shop"');
    });
    it('accepts cause and statusCode positionally', () => {
        const err = new UnknownShopDomainError('forge.shop', 'lookup failed', 410);
        expect(err.cause).toBe('lookup failed');
        expect(err.statusCode).toBe(410);
    });
    it('is reachable through getErrorFromCode', () => {
        expect(getErrorFromCode(ApiErrorKind.API_UNKNOWN_SHOP_DOMAIN)).toBe(UnknownShopDomainError);
    });
});

describe('DomainVerificationError', () => {
    it('carries the domain-verification code and a 422 status', () => {
        const error = new DomainVerificationError('shop.acme.com is not pointed at the platform yet.');
        expect(error.code).toBe(ApiErrorKind.API_DOMAIN_VERIFICATION_FAILED);
        expect(error.statusCode).toBe(422);
        expect(error.name).toBe('DomainVerificationError');
        expect(error instanceof DomainVerificationError).toBe(true);
    });

    it('is resolvable from its code', () => {
        const resolved = getErrorFromCode(ApiErrorKind.API_DOMAIN_VERIFICATION_FAILED);
        expect(resolved).toBe(DomainVerificationError);
    });
});

describe('Error.isTodo', () => {
    it('matches a TodoError instance', () => {
        expect(CommerceError.isTodo(new TodoError())).toBe(true);
    });
    it('matches any object carrying the GENERIC_TODO code', () => {
        expect(CommerceError.isTodo({ code: GenericErrorKind.GENERIC_TODO })).toBe(true);
    });
    it('rejects a different error kind', () => {
        expect(CommerceError.isTodo(new NotFoundError())).toBe(false);
    });
    it('rejects primitives, null, and undefined', () => {
        expect(CommerceError.isTodo(undefined)).toBe(false);
        expect(CommerceError.isTodo(null)).toBe(false);
        expect(CommerceError.isTodo('GENERIC_TODO')).toBe(false);
    });
});

describe('error code enums', () => {
    // Every member's string value MUST equal its member name. The whole system
    // — runtime help URLs (`/errors/<code>/`), `getErrorFromCode`, and the docs
    // catalogue generator — keys off the code value, so a drifted value (e.g.
    // `API_METHOD_NOT_ALLOWED = 'API_IMAGE_NO_FRACTIONAL'`) silently routes an
    // error to the wrong doc page and breaks the catalogue. Driven by `ERROR_KINDS`
    // so a newly-registered enum is covered without editing this list.
    it.each(Object.entries(ERROR_KINDS))('%s: every member value equals its member name', (_name, kind) => {
        for (const [member, value] of Object.entries(kind)) {
            expect(value).toBe(member);
        }
    });

    it('getAllErrorCodes returns a unique, non-empty set of codes', () => {
        const codes = getAllErrorCodes();
        expect(codes.length).toBeGreaterThan(0);
        expect(new Set(codes).size).toBe(codes.length);
    });

    it('every code resolves to a class whose own code round-trips', () => {
        for (const code of getAllErrorCodes()) {
            const Cls = getErrorFromCode(code);
            expect(Cls, `no class mapped for ${code}`).not.toBeNull();
            // The resolved class, when instantiated, reports the same code —
            // catching switch/class drift on top of the enum invariant above.
            expect(new (Cls as new () => CommerceError)().code).toBe(code);
        }
    });
});
