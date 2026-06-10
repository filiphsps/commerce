import { BuiltinError } from './error';

/**
 * Base class for all structured commerce errors, providing a typed error code, HTTP status code, human-readable details, and a documentation help URL.
 *
 * Subclasses set `name`, `code`, `details`, and `description` as class fields.
 *
 * @param message - Optional message forwarded to the native `Error` constructor.
 * @example
 * ```ts
 * class ProductNotFoundError extends Error<GenericErrorKind> {
 *     name = 'ProductNotFoundError';
 *     code = GenericErrorKind.NOT_FOUND;
 *     details = 'Product not found';
 *     description = 'No product exists for the given handle';
 * }
 * throw new ProductNotFoundError();
 * ```
 */
export class Error<T = unknown> extends BuiltinError {
    public readonly name: string = 'Error';
    public readonly details!: string;
    public readonly description!: string;
    public readonly code!: T;
    public readonly statusCode?: number;
    // Defined in the constructor using `Object.defineProperty`.
    public readonly help!: string;

    get [Symbol.toStringTag]() {
        return this.name;
    }
    get [Symbol.for('nodejs.util.inspect.custom')]() {
        return `${this.name}: <${JSON.stringify(this, null, 4)}>`;
    }

    public constructor(message?: string) {
        super(message);

        Object.defineProperty(this, 'help', {
            get: function () {
                const domain = process.env.SERVICE_DOMAIN;
                return `https://${domain}/docs/errors/${this.code}/`;
            },
            enumerable: true,
            configurable: false,
        });
        // Restore the prototype after the transpiled `extends` flattens it.
        // Use `new.target.prototype`, NOT `Error.prototype`: the latter reset every
        // instance to this base class, silently breaking `instanceof` for every
        // subclass (e.g. `err instanceof NotFoundError`). `new.target` is the
        // originally-invoked class, so each instance keeps its real prototype while
        // the chain still includes this base (so `instanceof Error` stays true).
        Object.setPrototypeOf(this, new.target.prototype);
    }

    /**
     * Checks whether another error has the same error code as this instance.
     *
     * @param error - Any value; compared against this instance's `.code` by equality, not object identity. Non-`Error` values always return `false`.
     * @returns `true` when `error` is an `Error` instance with an identical `code`.
     * @example
     * ```ts
     * const a = new NotFoundError();
     * const b = new NotFoundError();
     * a.is(b); // true — same code
     * a.is(new UnknownError()); // false — different code
     * ```
     */
    public is(error: Error | unknown): boolean {
        if (!(error instanceof Error)) {
            return false;
        }

        return this.code === error.code;
    }

    /**
     * Type guard that narrows an unknown value to this package's `Error` type.
     *
     * @param error - Any caught or unknown value; distinguishes this package's `Error<T>` subtype from the native global `Error`, which `instanceof globalThis.Error` would conflate.
     * @returns `true` when `error` is an instance of this package's `Error`.
     * @example
     * ```ts
     * try { await fetchData(); } catch (e) {
     *     if (Error.isError(e)) {
     *         console.error(e.code); // narrowed to Error<unknown>
     *     }
     * }
     * ```
     */
    public static override isError(error: unknown): error is Error {
        return error instanceof Error;
    }

    /**
     * Heuristic check for any "not found" variant, covering `NotFoundError`, `InvalidHandleError`, `InvalidIDError`, `UnknownLocaleError`, any error with HTTP 404, and certain message patterns.
     *
     * @param error - Any value; matches `NotFoundError`, `InvalidHandleError`, `InvalidIDError`, `UnknownLocaleError`, and any object with `statusCode === 404`. Rejects primitives and objects that carry no recognizable not-found signal.
     * @returns `true` when the error represents a not-found condition.
     * @example
     * ```ts
     * try { await fetchProduct(handle); } catch (e) {
     *     if (Error.isNotFound(e)) { return notFound(); }
     *     throw e;
     * }
     * ```
     */
    public static isNotFound(error: Error | unknown): boolean {
        if (typeof error === 'undefined' || error === null || typeof error !== 'object') {
            return false;
        }

        switch (true) {
            case error instanceof NotFoundError:
            case error instanceof InvalidHandleError:
            case error instanceof InvalidIDError:
            case error instanceof UnknownLocaleError:
                return true;
        }

        if ('statusCode' in error && error.statusCode === 404) {
            return true;
        }

        const message = error instanceof Error ? error.message : undefined;
        if (!message) {
            return false;
        }

        return false;
    }
}

/**
 * Error codes for all API-layer errors raised during shop resolution, commerce-provider calls, cart operations, and request handling.
 *
 * @example
 * ```ts
 * import { ApiErrorKind } from '@nordcom/commerce-errors';
 * if (error.code === ApiErrorKind.API_UNKNOWN_SHOP_DOMAIN) { return notFound(); }
 * ```
 */
export enum ApiErrorKind {
    API_UNKNOWN_ERROR = 'API_UNKNOWN_ERROR',
    API_UNKNOWN_SHOP_DOMAIN = 'API_UNKNOWN_SHOP_DOMAIN',
    API_UNKNOWN_COMMERCE_PROVIDER = 'API_UNKNOWN_COMMERCE_PROVIDER',
    API_UNKNOWN_LOCALE = 'API_UNKNOWN_LOCALE',
    API_INVALID_SHOP = 'API_INVALID_SHOP',
    API_INVALID_SHOP_DOMAIN = 'API_INVALID_SHOP_DOMAIN',
    API_INVALID_HANDLE = 'API_INVALID_HANDLE',
    API_INVALID_ID = 'API_INVALID_ID',
    API_INVALID_CART = 'API_INVALID_CART',
    API_CART_NOT_FOUND = 'API_CART_NOT_FOUND',
    API_CART_USER_ERROR = 'API_CART_USER_ERROR',
    API_CART_PROVIDER_ERROR = 'API_CART_PROVIDER_ERROR',
    API_TOO_MANY_REQUESTS = 'API_TOO_MANY_REQUESTS',
    API_METHOD_NOT_ALLOWED = 'API_IMAGE_NO_FRACTIONAL',
    API_IMAGE_NO_FRACTIONAL = 'API_ICON_WIDTH_NO_FRACTIONAL',
    API_IMAGE_OUT_OF_BOUNDS = 'API_IMAGE_OUT_OF_BOUNDS',
    API_NO_LOCALES_AVAILABLE = 'API_NO_LOCALES_AVAILABLE',
    API_INVALID_SHOPIFY_CUSTOMER_ACCOUNT_API_CONFIGURATION = 'API_INVALID_SHOPIFY_CUSTOMER_ACCOUNT_API_CONFIGURATION',
    API_MISSING_ENVIRONMENT_VARIABLE = 'API_MISSING_ENVIRONMENT_VARIABLE',
    API_PROVIDER_FETCH_FAILED = 'API_PROVIDER_FETCH_FAILED',
    API_SHOPIFY_GRAPHQL_DUPLICATE_CONTEXT_DIRECTIVE = 'API_SHOPIFY_GRAPHQL_DUPLICATE_CONTEXT_DIRECTIVE',
    API_SHOPIFY_GRAPHQL_DUPLICATE_CONTEXT_VARIABLE = 'API_SHOPIFY_GRAPHQL_DUPLICATE_CONTEXT_VARIABLE',
    API_UNKNOWN_SHOP_ID = 'API_UNKNOWN_SHOP_ID',
    API_SHOP_MISCONFIGURATION = 'API_SHOP_MISCONFIGURATION',
    API_MALFORMED_FORM_PAYLOAD = 'API_MALFORMED_FORM_PAYLOAD',
    API_UNKNOWN_COLLECTION_SLUG = 'API_UNKNOWN_COLLECTION_SLUG',
    API_NO_LOCALE_RESOLVABLE = 'API_NO_LOCALE_RESOLVABLE',
    API_MISSING_UPLOAD_FILE = 'API_MISSING_UPLOAD_FILE',
    API_EMPTY_UPLOAD_FILE = 'API_EMPTY_UPLOAD_FILE',
    API_MISSING_REQUIRED_FIELD = 'API_MISSING_REQUIRED_FIELD',
    API_UNSUPPORTED_UPLOAD_MIME_TYPE = 'API_UNSUPPORTED_UPLOAD_MIME_TYPE',
    API_MEDIA_STORAGE_UPLOAD_FAILED = 'API_MEDIA_STORAGE_UPLOAD_FAILED',
}

/**
 * Base class for all API-layer errors, defaulting to HTTP 500 and the `API_UNKNOWN_ERROR` code family.
 *
 * @param cause - Optional upstream message to store as the error cause string.
 * @param statusCode - Override the default HTTP status code.
 * @example
 * ```ts
 * throw new ApiError('upstream fetch failed', 503);
 * ```
 */
export class ApiError extends Error<ApiErrorKind> {
    statusCode = 500;
    name = 'ApiError';
    details = 'API Error';
    description = 'An API error occurred';

    constructor(cause?: string, statusCode?: number) {
        super();

        if (cause) {
            this.cause = cause;
        }

        if (statusCode) {
            this.statusCode = statusCode;
        }
    }
}

/**
 * Signals an unexpected or unclassified API error with no further context.
 *
 * @example
 * ```ts
 * throw new UnknownError();
 * ```
 */
export class UnknownError extends ApiError {
    name = 'UnknownError';
    details = 'Unknown Error';
    description = 'An unknown error occurred';
    code = ApiErrorKind.API_UNKNOWN_ERROR;
}
/**
 * Signals that no shop record could be matched to the given hostname, returning HTTP 404 by default.
 *
 * @param domain - The hostname that failed shop resolution; embedded in the description when provided.
 * @param cause - Optional upstream message to store as the error cause.
 * @param statusCode - Override the default 404 HTTP status code.
 * @example
 * ```ts
 * throw new UnknownShopDomainError('shop.example.com');
 * ```
 */
export class UnknownShopDomainError extends UnknownError {
    statusCode = 404;
    name = 'UnknownShopDomainError';
    details = 'Unknown shop domain';
    description = 'Could not find a shop with the given domain';
    code = ApiErrorKind.API_UNKNOWN_SHOP_DOMAIN;

    constructor(domain?: string, cause?: string, statusCode?: number) {
        super(cause, statusCode);
        if (domain) {
            this.description = this.description.replace('the given domain', `domain "${domain}"`);
        }
        if (statusCode !== undefined) {
            this.statusCode = statusCode;
        }
    }
}
/**
 * Signals that no commerce provider is registered for the requested provider type.
 *
 * @example
 * ```ts
 * throw new UnknownCommerceProviderError();
 * ```
 */
export class UnknownCommerceProviderError extends UnknownError {
    name = 'UnknownCommerceProviderError';
    details = 'Unknown commerce provider';
    description = 'Could not find a commerce provider with the given type';
    code = ApiErrorKind.API_UNKNOWN_COMMERCE_PROVIDER;
}
/**
 * Signals that the locale code supplied by the request is not supported or cannot be parsed, returning HTTP 404 by default.
 *
 * @param code - The locale code that failed validation; embedded in the description when provided.
 * @param cause - Optional upstream message to store as the error cause.
 * @param statusCode - Override the default 404 HTTP status code.
 * @example
 * ```ts
 * throw new UnknownLocaleError('zz-ZZ');
 * ```
 */
export class UnknownLocaleError extends UnknownError {
    statusCode = 404;
    name = 'UnknownLocaleError';
    details = 'Unknown locale';
    description = 'Unsupported or invalid locale code was provided';
    code = ApiErrorKind.API_UNKNOWN_LOCALE;

    constructor(code?: unknown, cause?: string, statusCode?: number) {
        super(cause, statusCode);

        if (code) {
            const codeStr = typeof code === 'string' ? code : JSON.stringify(code);
            this.description = this.description.replace('code', `code "${codeStr}"`);
        }
    }
}

/**
 * Signals that the resolved shop record is structurally invalid, returning HTTP 400.
 *
 * @example
 * ```ts
 * throw new InvalidShopError();
 * ```
 */
export class InvalidShopError extends ApiError {
    statusCode = 400;
    name = 'InvalidShopError';
    details = 'Invalid shop';
    description = 'The current shop is invalid';
    code = ApiErrorKind.API_INVALID_SHOP;
}
/**
 * Signals that the supplied shop domain string is malformed or otherwise invalid, returning HTTP 400.
 *
 * @param domain - The domain string that failed validation; embedded in the description when provided.
 * @param cause - Optional upstream message to store as the error cause.
 * @param statusCode - Override the default 400 HTTP status code.
 * @example
 * ```ts
 * throw new InvalidShopDomainError('not_a_domain');
 * ```
 */
export class InvalidShopDomainError extends ApiError {
    statusCode = 400;
    name = 'InvalidShopDomainError';
    details = 'Invalid shop';
    description = 'The given domain is invalid';
    code = ApiErrorKind.API_INVALID_SHOP_DOMAIN;

    constructor(domain?: string, cause?: string, statusCode?: number) {
        super(cause, statusCode);
        if (domain) {
            this.description = this.description.replace('given domain', `domain "${domain}"`);
        }
        if (statusCode !== undefined) {
            this.statusCode = statusCode;
        }
    }
}
/**
 * Signals that a Shopify resource handle is missing, malformed, or resolves to no resource, returning HTTP 404.
 *
 * @param handle - The handle that failed resolution; embedded in the description when provided.
 * @param cause - Optional upstream message to store as the error cause.
 * @param statusCode - Override the default 404 HTTP status code.
 * @example
 * ```ts
 * throw new InvalidHandleError('unknown-product-handle');
 * ```
 */
export class InvalidHandleError extends ApiError {
    statusCode = 404;
    name = 'InvalidHandleError';
    details = 'Invalid handle';
    description = 'The handle is invalid';
    code = ApiErrorKind.API_INVALID_HANDLE;

    constructor(handle?: string, cause?: string, statusCode?: number) {
        super(cause, statusCode);

        if (handle) {
            this.description = this.description.replace('handle', `handle "${handle}"`);
        }
    }
}
/**
 * Signals that an entity ID is missing, malformed, or resolves to no entity, returning HTTP 404.
 *
 * @param id - The ID value that failed resolution; converted to string and embedded in the description when provided.
 * @param cause - Optional upstream message to store as the error cause.
 * @param statusCode - Override the default 404 HTTP status code.
 * @example
 * ```ts
 * throw new InvalidIDError('gid://shopify/Product/99999');
 * ```
 */
export class InvalidIDError extends ApiError {
    statusCode = 404;
    name = 'InvalidIDError';
    details = 'Invalid ID';
    description = 'The ID is invalid';
    code = ApiErrorKind.API_INVALID_ID;

    constructor(id?: unknown, cause?: string, statusCode?: number) {
        super(cause, statusCode);

        if (id !== undefined && id !== null) {
            this.description = this.description.replace('ID', `ID "${String(id)}"`);
        }
    }
}
/**
 * Signals that the cart token or structure is invalid, returning HTTP 404.
 *
 * @example
 * ```ts
 * throw new InvalidCartError();
 * ```
 */
export class InvalidCartError extends ApiError {
    statusCode = 404;
    name = 'InvalidCartError';
    details = 'Invalid cart';
    description = 'The cart is invalid';
    code = ApiErrorKind.API_INVALID_CART;
}
/**
 * Signals that the requested cart could not be located by its identifier, returning HTTP 404.
 *
 * @param cartId - The cart token that failed lookup; embedded in the description when provided.
 * @param cause - Optional upstream message to store as the error cause.
 * @param statusCode - Override the default 404 HTTP status code.
 * @example
 * ```ts
 * throw new CartNotFoundError('abc123-cart-token');
 * ```
 */
export class CartNotFoundError extends ApiError {
    statusCode = 404;
    name = 'CartNotFoundError';
    details = 'Cart not found';
    description = 'The requested cart could not be found';
    code = ApiErrorKind.API_CART_NOT_FOUND;

    constructor(cartId?: string, cause?: string, statusCode?: number) {
        super(cause, statusCode);

        if (cartId) {
            this.description = `Cart "${cartId}" not found.`;
        }
    }
}
/**
 * Signals that the cart provider rejected the mutation with one or more user-facing validation errors, returning HTTP 400.
 *
 * @param userErrors - Array of field-level or global errors returned by the cart provider.
 * @param cause - Optional upstream message to store as the error cause.
 * @param statusCode - Override the default 400 HTTP status code.
 * @example
 * ```ts
 * throw new CartUserError([{ field: 'quantity', message: 'Must be at least 1' }]);
 * ```
 */
export class CartUserError extends ApiError {
    statusCode = 400;
    name = 'CartUserError';
    details = 'Cart user error';
    description = 'The cart provider rejected the request with user-facing errors';
    code = ApiErrorKind.API_CART_USER_ERROR;

    public readonly userErrors: Array<{ field?: string; message: string }>;

    constructor(userErrors: Array<{ field?: string; message: string }> = [], cause?: string, statusCode?: number) {
        super(cause, statusCode);

        this.userErrors = userErrors;
        if (userErrors[0]?.message) {
            this.description = userErrors[0].message;
        }
    }
}
/**
 * Signals that the upstream cart provider returned an unexpected error, returning HTTP 502.
 *
 * @param message - Human-readable description of the provider failure; overrides the default description when provided.
 * @param providerCause - Raw response or object from the provider, stored for debugging.
 * @param cause - Optional upstream message to store as the error cause.
 * @param statusCode - Override the default 502 HTTP status code.
 * @example
 * ```ts
 * throw new CartProviderError('Shopify returned 503', shopifyResponse);
 * ```
 */
export class CartProviderError extends ApiError {
    statusCode = 502;
    name = 'CartProviderError';
    details = 'Cart provider error';
    description = 'The cart provider returned an error';
    code = ApiErrorKind.API_CART_PROVIDER_ERROR;

    public readonly providerCause?: unknown;

    constructor(message?: string, providerCause?: unknown, cause?: string, statusCode?: number) {
        super(cause, statusCode);

        if (message) {
            this.description = message;
        }
        this.providerCause = providerCause;
    }
}

/**
 * Signals that the client has exceeded the rate limit, returning HTTP 429.
 *
 * @example
 * ```ts
 * throw new TooManyRequestsError();
 * ```
 */
export class TooManyRequestsError extends ApiError {
    statusCode = 429;
    name = 'TooManyRequestsError';
    details = 'Too many requests';
    description = 'You are being rate limited';
    code = ApiErrorKind.API_TOO_MANY_REQUESTS;
}

/**
 * Signals that the HTTP method used is not supported by the endpoint, returning HTTP 405.
 *
 * @example
 * ```ts
 * throw new MethodNotAllowedError();
 * ```
 */
export class MethodNotAllowedError extends ApiError {
    statusCode = 405;
    name = 'MethodNotAllowedError';
    details = 'Method not allowed';
    description = 'The endpoint does not support the given method';
    code = ApiErrorKind.API_METHOD_NOT_ALLOWED;
}

/**
 * Signals that a fractional (non-integer) `width` or `height` was supplied to an image transform endpoint, returning HTTP 400.
 *
 * @example
 * ```ts
 * throw new ImageNoFractionalError();
 * ```
 */
export class ImageNoFractionalError extends ApiError {
    statusCode = 400;
    name = 'ImageNoFractionalError';
    details = 'Invalid width or height';
    description = '`width`/`height` must be an integer';
    code = ApiErrorKind.API_IMAGE_NO_FRACTIONAL;
}
/**
 * Signals that `width` or `height` falls outside the allowed range of 1–1024, returning HTTP 400.
 *
 * @example
 * ```ts
 * throw new ImageOutOfBoundsError();
 * ```
 */
export class ImageOutOfBoundsError extends ApiError {
    statusCode = 400;
    name = 'ImageOutOfBoundsError';
    details = 'Width or height is out of bounds';
    description = '`width`/`height` must be between `1` and `1024` or `undefined`';
    code = ApiErrorKind.API_IMAGE_OUT_OF_BOUNDS;
}

/**
 * Signals that the shop has no locales configured, making it impossible to serve any request, returning HTTP 500.
 *
 * @example
 * ```ts
 * throw new NoLocalesAvailableError();
 * ```
 */
export class NoLocalesAvailableError extends ApiError {
    statusCode = 500;
    name = 'NoLocalesAvailableError';
    details = 'No locales available';
    description = 'No locales have been configured for the requested shop instance';
    code = ApiErrorKind.API_NO_LOCALES_AVAILABLE;
}

/**
 * Signals that the Shopify Customer Account API credentials or configuration are invalid or missing, returning HTTP 500.
 *
 * @example
 * ```ts
 * throw new InvalidShopifyCustomerAccountsApiConfiguration();
 * ```
 */
export class InvalidShopifyCustomerAccountsApiConfiguration extends ApiError {
    statusCode = 500;
    name = 'InvalidShopifyCustomerAccountsApiConfiguration';
    details = 'Invalid Shopify Customer Account API configuration';
    description = 'The Shopify Customer Account API configuration is invalid';
    code = ApiErrorKind.API_INVALID_SHOPIFY_CUSTOMER_ACCOUNT_API_CONFIGURATION;
}

/**
 * Signals that a required environment variable is absent at runtime, returning HTTP 500.
 *
 * @param variableName - The name of the missing variable; embedded in the description when provided.
 * @param hint - Optional guidance on how to set the variable; appended to the description when provided.
 * @param cause - Optional upstream message to store as the error cause.
 * @param statusCode - Override the default 500 HTTP status code.
 * @example
 * ```ts
 * throw new MissingEnvironmentVariableError('SHOPIFY_API_KEY', 'Set it in .env.local.');
 * ```
 */
export class MissingEnvironmentVariableError extends ApiError {
    statusCode = 500;
    name = 'MissingEnvironmentVariableError';
    details = 'Missing environment variable';
    description = 'A required environment variable is missing';
    code = ApiErrorKind.API_MISSING_ENVIRONMENT_VARIABLE;

    constructor(variableName?: string, hint?: string, cause?: string, statusCode?: number) {
        super(cause, statusCode);
        if (variableName) {
            this.description = this.description.replace(
                'A required environment variable',
                `Required environment variable "${variableName}"`,
            );
        }
        if (hint) {
            this.description = `${this.description}. ${hint}`;
        }
        // Re-apply statusCode here: ApiError's ctor body sets it, but our
        // class field `statusCode = 500` runs after super() returns and
        // overrides it. Setting it again in the derived ctor body is the
        // last write, so it wins.
        if (statusCode !== undefined) {
            this.statusCode = statusCode;
        }
    }
}

/**
 * Signals that a fetch from an external data provider failed, returning HTTP 500.
 *
 * @param sourceErrors - Raw error payload from the provider; passed through {@link ProviderFetchError.stringifyInput} and stored as `cause`.
 * @example
 * ```ts
 * throw new ProviderFetchError(response.errors);
 * ```
 */
export class ProviderFetchError extends ApiError {
    statusCode = 500;
    name = 'ProviderFetchError';
    details = 'Failed to fetch from source';
    description = 'Failed to fetch from source';
    code = ApiErrorKind.API_PROVIDER_FETCH_FAILED;

    /**
     * Converts an arbitrary provider error payload into a human-readable string, or `null` when the input carries no textual content.
     *
     * @param input - The raw error value from the provider; may be a string, number, boolean, array, object with `message`/`status`, or `null`/`undefined`.
     * @returns A string description of the error, or `null` when no meaningful text can be extracted.
     * @example
     * ```ts
     * const msg = ProviderFetchError.stringifyInput(response.errors);
     * if (msg) console.error(msg);
     * ```
     */
    static stringifyInput(input: unknown): string | null {
        if (typeof input === 'undefined' || input === null) {
            return null;
        }
        if (typeof input === 'function') {
            console.warn('stringifyUnknownErrorInput() called with a function, returning null');
            return null;
        }

        if (typeof input === 'string') {
            return input;
        }

        if (typeof input === 'number') {
            return input.toString();
        }
        if (typeof input === 'boolean') {
            return input.toString();
        }

        if (Array.isArray(input)) {
            return input
                .map((error) => {
                    if (typeof error === 'undefined' || error === null) {
                        return typeof error;
                    }

                    if (typeof error === 'string') {
                        return error;
                    }

                    if (typeof error === 'object') {
                        if ('message' in error) {
                            return error.message;
                        }

                        if ('status' in error) {
                            if ('statusText' in error) {
                                return `${error.status}: ${error.statusText}`;
                            }

                            return error.status;
                        }
                    }

                    return JSON.stringify(error, null, 4);
                })
                .join('\n');
        }

        if (typeof input === 'object' && input !== null) {
            if ('message' in input && 'name' in input) {
                if ('toString' in input && typeof input.toString === 'function') {
                    return input.toString();
                }

                return `${String(input.name)}: ${String(input.message)}`;
            }

            if ('status' in input) {
                if ('statusText' in input) {
                    return `${String(input.status)}: ${String(input.statusText)}`;
                }

                return String(input.status);
            }
        }

        return null;
    }

    constructor(sourceErrors?: unknown) {
        super();

        this.cause = ProviderFetchError.stringifyInput(sourceErrors);
    }
}

/**
 * Signals that a Shopify GraphQL operation already declares an `@inContext` directive, which conflicts with the `inContextTransform`'s sole ownership of context injection, returning HTTP 500.
 *
 * @param operationName - The GraphQL operation name that contains the duplicate directive; embedded in the description when provided.
 * @param cause - Optional upstream message to store as the error cause.
 * @param statusCode - Override the default 500 HTTP status code.
 * @example
 * ```ts
 * throw new DuplicateContextDirectiveError('GetProduct');
 * ```
 */
export class DuplicateContextDirectiveError extends ApiError {
    statusCode = 500;
    name = 'DuplicateContextDirectiveError';
    details = 'Duplicate @inContext directive';
    description =
        'Source operation already declares an @inContext directive; the inContextTransform owns context injection and the operation must not pre-declare it';
    code = ApiErrorKind.API_SHOPIFY_GRAPHQL_DUPLICATE_CONTEXT_DIRECTIVE;

    constructor(operationName?: string, cause?: string, statusCode?: number) {
        super(cause, statusCode);

        if (operationName) {
            this.description = this.description.replace('Source operation', `Source operation "${operationName}"`);
        }
    }
}

/**
 * Signals that a Shopify GraphQL operation pre-declares a reserved context variable (`$country` or `$language`) that is owned by the `inContextTransform`, returning HTTP 500.
 *
 * @param operationName - The GraphQL operation name that pre-declares the reserved variable.
 * @param variableName - The specific reserved variable name (`'country'` or `'language'`).
 * @param cause - Optional upstream message to store as the error cause.
 * @param statusCode - Override the default 500 HTTP status code.
 * @example
 * ```ts
 * throw new DuplicateContextVariableError('GetProduct', 'country');
 * ```
 */
export class DuplicateContextVariableError extends ApiError {
    statusCode = 500;
    name = 'DuplicateContextVariableError';
    details = 'Duplicate context variable';
    description =
        'Source operation already declares a reserved context variable ($country or $language); the inContextTransform owns these and the operation must not pre-declare them';
    code = ApiErrorKind.API_SHOPIFY_GRAPHQL_DUPLICATE_CONTEXT_VARIABLE;

    constructor(operationName?: string, variableName?: 'country' | 'language', cause?: string, statusCode?: number) {
        super(cause, statusCode);

        if (operationName && variableName) {
            this.description = this.description.replace(
                'Source operation',
                `Source operation "${operationName}" (variable: $${variableName})`,
            );
        } else if (variableName) {
            this.description = this.description.replace(
                'reserved context variable ($country or $language)',
                `reserved context variable ($${variableName})`,
            );
        } else if (operationName) {
            this.description = this.description.replace('Source operation', `Source operation "${operationName}"`);
        }
    }
}

/**
 * Signals that no shop record could be found for the given internal shop ID, returning HTTP 404.
 *
 * @param id - The shop ID that failed resolution; embedded in the description when provided.
 * @param cause - Optional upstream message to store as the error cause.
 * @param statusCode - Override the default 404 HTTP status code.
 * @example
 * ```ts
 * throw new UnknownShopIdError('shop_01JXXXXX');
 * ```
 */
export class UnknownShopIdError extends UnknownError {
    statusCode = 404;
    name = 'UnknownShopIdError';
    details = 'Unknown shop id';
    description = 'Could not find a shop with the given id';
    code = ApiErrorKind.API_UNKNOWN_SHOP_ID;

    constructor(id?: string, cause?: string, statusCode?: number) {
        super(cause, statusCode);
        if (id) {
            this.description = this.description.replace('the given id', `id "${id}"`);
        }
    }
}

/**
 * Signals that a shop record is present but missing required configuration fields, returning HTTP 500.
 *
 * @param domain - The shop domain for which configuration is invalid; embedded in the description when provided.
 * @param missingFields - Names of the configuration fields that are absent or empty.
 * @param cause - Optional upstream message to store as the error cause.
 * @param statusCode - Override the default 500 HTTP status code.
 * @example
 * ```ts
 * throw new ShopMisconfigurationError('shop.example.com', ['apiKey', 'storeDomain']);
 * ```
 */
export class ShopMisconfigurationError extends ApiError {
    statusCode = 500;
    name = 'ShopMisconfigurationError';
    details = 'Shop is misconfigured';
    description = 'The shop is misconfigured';
    code = ApiErrorKind.API_SHOP_MISCONFIGURATION;

    constructor(domain?: string, missingFields?: readonly string[], cause?: string, statusCode?: number) {
        super(cause, statusCode);
        if (domain) {
            this.description = this.description.replace('The shop', `Shop "${domain}"`);
        }
        if (missingFields && missingFields.length > 0) {
            this.description = `${this.description}: missing ${missingFields.join(', ')}`;
        }
    }
}

/**
 * Signals that an incoming form payload could not be parsed or fails structural validation, returning HTTP 400.
 *
 * @param cause - Optional parse error or unexpected value; converted to a string and stored as the cause.
 * @example
 * ```ts
 * throw new MalformedFormPayloadError(parseError);
 * ```
 */
export class MalformedFormPayloadError extends ApiError {
    statusCode = 400;
    name = 'MalformedFormPayloadError';
    details = 'Malformed form payload';
    description = 'The form payload could not be parsed';
    code = ApiErrorKind.API_MALFORMED_FORM_PAYLOAD;

    constructor(cause?: unknown) {
        super();
        if (cause !== undefined && cause !== null) {
            this.cause = cause instanceof globalThis.Error ? cause.message : String(cause);
        }
    }
}

/**
 * Signals that no collection is registered under the given slug in the CMS manifest, returning HTTP 500.
 *
 * @param slug - The unrecognized collection slug; embedded in the description when provided.
 * @param cause - Optional upstream message to store as the error cause.
 * @param statusCode - Override the default 500 HTTP status code.
 * @example
 * ```ts
 * throw new UnknownCollectionSlugError('blog-posts');
 * ```
 */
export class UnknownCollectionSlugError extends ApiError {
    statusCode = 500;
    name = 'UnknownCollectionSlugError';
    details = 'Unknown collection slug';
    description = 'No collection is registered with the given slug';
    code = ApiErrorKind.API_UNKNOWN_COLLECTION_SLUG;

    constructor(slug?: string, cause?: string, statusCode?: number) {
        super(cause, statusCode);
        if (slug) {
            this.description = this.description.replace('the given slug', `slug "${slug}"`);
        }
    }
}

/**
 * Signals that no locale could be resolved for the request and the shop has no default locale configured, returning HTTP 500.
 *
 * @param url - The request URL that failed locale resolution; embedded in the description when provided.
 * @param cause - Optional upstream message to store as the error cause.
 * @param statusCode - Override the default 500 HTTP status code.
 * @example
 * ```ts
 * throw new NoLocaleResolvableError(request.url);
 * ```
 */
export class NoLocaleResolvableError extends ApiError {
    statusCode = 500;
    name = 'NoLocaleResolvableError';
    details = 'No locale resolvable';
    description = 'No locale could be resolved for the request and no default locale is set';
    code = ApiErrorKind.API_NO_LOCALE_RESOLVABLE;

    constructor(url?: string, cause?: string, statusCode?: number) {
        super(cause, statusCode);
        if (url) {
            this.description = this.description.replace('the request', `"${url}"`);
        }
    }
}

/**
 * Signals that an upload request contains no attached file, returning HTTP 400.
 *
 * @example
 * ```ts
 * throw new MissingUploadFileError();
 * ```
 */
export class MissingUploadFileError extends ApiError {
    statusCode = 400;
    name = 'MissingUploadFileError';
    details = 'Missing upload file';
    description = 'No file was provided with the upload';
    code = ApiErrorKind.API_MISSING_UPLOAD_FILE;
}

/**
 * Signals that the uploaded file exists but is empty (zero bytes), returning HTTP 400.
 *
 * @example
 * ```ts
 * throw new EmptyUploadFileError();
 * ```
 */
export class EmptyUploadFileError extends ApiError {
    statusCode = 400;
    name = 'EmptyUploadFileError';
    details = 'Empty upload file';
    description = 'The uploaded file is empty';
    code = ApiErrorKind.API_EMPTY_UPLOAD_FILE;
}

/**
 * Signals that a required field is absent in the incoming payload, returning HTTP 400.
 *
 * @param fieldName - The name of the absent field; embedded in the description when provided.
 * @param cause - Optional upstream message to store as the error cause.
 * @param statusCode - Override the default 400 HTTP status code.
 * @example
 * ```ts
 * throw new MissingRequiredFieldError('email');
 * ```
 */
export class MissingRequiredFieldError extends ApiError {
    statusCode = 400;
    name = 'MissingRequiredFieldError';
    details = 'Missing required field';
    description = 'A required field is missing';
    code = ApiErrorKind.API_MISSING_REQUIRED_FIELD;

    constructor(fieldName?: string, cause?: string, statusCode?: number) {
        super(cause, statusCode);
        if (fieldName) {
            this.description = this.description.replace('A required field', `Required field "${fieldName}"`);
        }
    }
}

/**
 * Signals that an uploaded file's mime type is outside the media allowlist (any image, mp4 video,
 * or PDF), returning HTTP 415.
 *
 * @param mimeType - The rejected mime type; embedded in the description when provided.
 * @param cause - Optional upstream message to store as the error cause.
 * @param statusCode - Override the default 415 HTTP status code.
 * @example
 * ```ts
 * throw new UnsupportedUploadMimeTypeError('text/html');
 * ```
 */
export class UnsupportedUploadMimeTypeError extends ApiError {
    statusCode = 415;
    name = 'UnsupportedUploadMimeTypeError';
    details = 'Unsupported upload mime type';
    description = 'The uploaded file has a mime type that is not allowed';
    code = ApiErrorKind.API_UNSUPPORTED_UPLOAD_MIME_TYPE;

    constructor(mimeType?: string, cause?: string, statusCode?: number) {
        super(cause, statusCode);
        if (mimeType) {
            this.description = this.description.replace('a mime type', `mime type "${mimeType}"`);
        }
    }
}

/**
 * Signals that POSTing bytes to a Convex file-storage upload URL failed (non-2xx response or a
 * response without a `storageId`), returning HTTP 502 — the byte sink is an upstream dependency of
 * the media upload pipeline, not a client fault.
 *
 * @param status - The byte sink's HTTP status; embedded in the description when provided.
 * @param cause - Optional upstream message to store as the error cause.
 * @example
 * ```ts
 * throw new MediaStorageUploadError(503);
 * ```
 */
export class MediaStorageUploadError extends ApiError {
    statusCode = 502;
    name = 'MediaStorageUploadError';
    details = 'Media storage upload failed';
    description = 'The media byte upload to Convex file storage failed';
    code = ApiErrorKind.API_MEDIA_STORAGE_UPLOAD_FAILED;

    constructor(status?: number, cause?: string) {
        super(cause);
        if (status !== undefined) {
            this.description = `${this.description} (byte sink responded ${status})`;
        }
    }
}

/**
 * Error codes for non-API, application-layer errors covering unclassified failures, type violations, context misuse, and CMS configuration issues.
 *
 * @example
 * ```ts
 * import { GenericErrorKind } from '@nordcom/commerce-errors';
 * if (error.code === GenericErrorKind.NOT_FOUND) { return notFound(); }
 * ```
 */
export enum GenericErrorKind {
    GENERIC_UNKNOWN_ERROR = 'GENERIC_UNKNOWN_ERROR',
    GENERIC_TODO = 'GENERIC_TODO',
    NOT_FOUND = 'NOT_FOUND',
    UNREACHABLE = 'UNREACHABLE',
    INVALID_TYPE = 'INVALID_TYPE',
    MISSING_CONTEXT_PROVIDER = 'MISSING_CONTEXT_PROVIDER',
    NOT_CONNECTED_TO_DATABASE = 'NOT_CONNECTED_TO_DATABASE',
    MISSING_SESSION_USER_ID = 'MISSING_SESSION_USER_ID',
    GENERIC_MISSING_TENANT_FOR_SCOPED_COLLECTION = 'GENERIC_MISSING_TENANT_FOR_SCOPED_COLLECTION',
    GENERIC_EMPTY_TENANT_SCOPE = 'GENERIC_EMPTY_TENANT_SCOPE',
    GENERIC_MISSING_LIST_CONFIG = 'GENERIC_MISSING_LIST_CONFIG',
    GENERIC_MISSING_CONVEX_BRIDGE = 'GENERIC_MISSING_CONVEX_BRIDGE',
    GENERIC_CONVEX_OPERATOR_TOKEN_MINT = 'GENERIC_CONVEX_OPERATOR_TOKEN_MINT',
    GENERIC_DUPLICATE_PREDICATE_REGISTRATION = 'GENERIC_DUPLICATE_PREDICATE_REGISTRATION',
    GENERIC_MISSING_REQUEST_CONTEXT = 'GENERIC_MISSING_REQUEST_CONTEXT',
    GENERIC_DUPLICATE_WORKSPACE_SLUG = 'GENERIC_DUPLICATE_WORKSPACE_SLUG',
    GENERIC_MISSING_TYPEDOC_OUTPUT = 'GENERIC_MISSING_TYPEDOC_OUTPUT',
}

/**
 * Base class for application-layer errors not specific to the API surface, defaulting to HTTP 500.
 *
 * @param cause - Optional message describing the upstream cause; stored as the error cause string.
 * @example
 * ```ts
 * throw new GenericError('unexpected state in initialization');
 * ```
 */
export class GenericError extends Error<GenericErrorKind> {
    statusCode = 500;
    name = 'GenericError';
    details = 'Unknown error';
    description = 'An unknown error occurred';
    code = GenericErrorKind.GENERIC_UNKNOWN_ERROR;

    constructor(cause?: string) {
        super();

        if (cause) {
            this.cause = cause;
        }
    }
}
/**
 * Placeholder error for code paths that are not yet implemented, returning HTTP 404.
 *
 * @example
 * ```ts
 * throw new TodoError();
 * ```
 */
export class TodoError extends GenericError {
    statusCode = 404; // TODO: This ain't really correct.
    name = 'TodoError';
    details = 'TODO';
    description = 'This feature is not implemented yet';
    code = GenericErrorKind.GENERIC_TODO;
}
/**
 * Signals that a requested resource could not be located, returning HTTP 404.
 *
 * @param requestedResource - Optional identifier of the missing resource; embedded in the cause string when provided.
 * @example
 * ```ts
 * throw new NotFoundError('product:some-handle');
 * ```
 */
export class NotFoundError extends GenericError {
    statusCode = 404;
    name = 'NotFoundError';
    details = 'Not found';
    description = 'The requested resource could not be found';
    code = GenericErrorKind.NOT_FOUND;

    constructor(requestedResource?: string) {
        super();

        if (requestedResource) {
            this.cause = this.description.replace('resource', `resource "${requestedResource}"`);
        }
    }
}
/**
 * Signals that a supposedly unreachable code path was executed, indicating a logic error or exhaustiveness gap.
 *
 * @example
 * ```ts
 * throw new UnreachableError();
 * ```
 */
export class UnreachableError extends GenericError {
    name = 'UnreachableError';
    details = 'Unreachable code-path taken';
    description = 'Supposedly unreachable code-path taken';
    code = GenericErrorKind.UNREACHABLE;
}
/**
 * Signals that a value of an unexpected type was passed to a function or operation.
 *
 * @example
 * ```ts
 * throw new TypeError();
 * ```
 */
export class TypeError extends GenericError {
    name = 'TypeError';
    details = 'Invalid type';
    description = 'Invalid type was passed to function';
    code = GenericErrorKind.INVALID_TYPE;
}
/**
 * Signals that a React hook or context consumer was used outside its required provider, producing a descriptive message.
 *
 * @param functionName - The name of the hook or function that requires the provider.
 * @param contextName - The name of the React context component that must wrap the call site.
 * @example
 * ```ts
 * throw new MissingContextProviderError('useCart', 'CartProvider');
 * ```
 */
export class MissingContextProviderError extends GenericError {
    name = 'MissingContextProviderError';
    details = 'Missing context provider';
    code = GenericErrorKind.MISSING_CONTEXT_PROVIDER;

    constructor(functionName: string, contextName: string) {
        super();

        this.description = `\`${functionName}()\` must be used within a \`<${contextName}/>\` provider.`;
    }
}
/**
 * Signals that a database operation was attempted on an instance without an active connection.
 *
 * @example
 * ```ts
 * throw new NotConnectedToDatabase();
 * ```
 */
export class NotConnectedToDatabase extends GenericError {
    name = 'NotConnectedToDatabase';
    details = 'Not connected to the database';
    description = 'The instance provided does not have an active database connection.';
    code = GenericErrorKind.NOT_CONNECTED_TO_DATABASE;
}
/**
 * Signals that an authenticated session is missing a user ID, indicating a misconfigured auth adapter or JWT/session callback.
 *
 * @example
 * ```ts
 * throw new MissingSessionUserIdError();
 * ```
 */
export class MissingSessionUserIdError extends GenericError {
    statusCode = 500;
    name = 'MissingSessionUserIdError';
    details = 'Missing session user id';
    description = 'Authenticated session is missing a user id; check the auth adapter and the jwt/session callbacks';
    code = GenericErrorKind.MISSING_SESSION_USER_ID;
}

/**
 * Signals that a tenant-scoped collection was queried without a tenant context being present.
 *
 * @param collection - The collection slug that requires a tenant scope; embedded in the description when provided.
 * @example
 * ```ts
 * throw new MissingTenantForScopedCollectionError('products');
 * ```
 */
export class MissingTenantForScopedCollectionError extends GenericError {
    name = 'MissingTenantForScopedCollectionError';
    details = 'Missing tenant for scoped collection';
    description = 'A tenant-scoped collection was accessed without a tenant context';
    code = GenericErrorKind.GENERIC_MISSING_TENANT_FOR_SCOPED_COLLECTION;

    constructor(collection?: string) {
        super();
        if (collection) {
            this.description = this.description.replace(
                'A tenant-scoped collection',
                `Scoped collection "${collection}"`,
            );
        }
    }
}

/**
 * Signals that a tenant-scoped query received an empty shop ID, preventing the predicate from being applied correctly.
 *
 * @example
 * ```ts
 * throw new EmptyTenantScopeError();
 * ```
 */
export class EmptyTenantScopeError extends GenericError {
    name = 'EmptyTenantScopeError';
    details = 'Empty tenant scope';
    description = 'A tenant-scoped query received an empty shop id; refusing to broaden the predicate';
    code = GenericErrorKind.GENERIC_EMPTY_TENANT_SCOPE;
}

/**
 * Signals that the CMS editor manifest for a collection does not include a list view configuration.
 *
 * @param collection - The collection slug whose manifest is missing a list config; embedded in the description when provided.
 * @example
 * ```ts
 * throw new MissingListConfigError('pages');
 * ```
 */
export class MissingListConfigError extends GenericError {
    name = 'MissingListConfigError';
    details = 'Missing list config';
    description = 'The editor manifest has no list config; cannot render the list page';
    code = GenericErrorKind.GENERIC_MISSING_LIST_CONFIG;

    constructor(collection?: string) {
        super();
        if (collection) {
            this.description = this.description.replace('The editor manifest', `Editor manifest "${collection}"`);
        }
    }
}

/**
 * Signals that a CMS editor server action ran against a runtime with no Convex bridge wired, so the
 * action cannot reach its Convex-backed document mutations.
 *
 * @param collection - The collection slug whose editor action found no bridge; embedded in the description when provided.
 * @example
 * ```ts
 * throw new MissingConvexBridgeError('pages');
 * ```
 */
export class MissingConvexBridgeError extends GenericError {
    name = 'MissingConvexBridgeError';
    details = 'Missing Convex bridge';
    description = 'The editor runtime has no Convex bridge; cannot reach the CMS document mutations';
    code = GenericErrorKind.GENERIC_MISSING_CONVEX_BRIDGE;

    constructor(collection?: string) {
        super();
        if (collection) {
            this.description = this.description.replace('The editor runtime', `Editor runtime for "${collection}"`);
        }
    }
}

/**
 * Signals that an identity-authenticated Convex call could not obtain an operator bearer token —
 * either the server-side session has no authenticated operator or the RS256 minting material
 * (`CONVEX_AUTH_PRIVATE_KEY` / issuer / audience) is unconfigured. Raised instead of silently
 * issuing an unauthenticated call so a misconfigured deployment fails loud at the write seam.
 *
 * @param context - The surface that needed the token (e.g. a collection slug); embedded in the description when provided.
 * @example
 * ```ts
 * throw new ConvexOperatorTokenMintError('pages');
 * ```
 */
export class ConvexOperatorTokenMintError extends GenericError {
    name = 'ConvexOperatorTokenMintError';
    details = 'Convex operator token mint failed';
    description = 'No Convex operator token could be minted for the authenticated admin session';
    code = GenericErrorKind.GENERIC_CONVEX_OPERATOR_TOKEN_MINT;

    constructor(context?: string) {
        super();
        if (context) {
            this.description = `${this.description} (while calling "${context}")`;
        }
    }
}

/**
 * Signals that a tenant predicate with the same name was registered more than once.
 *
 * @param predicateName - The predicate name that was registered twice; embedded in the description when provided.
 * @example
 * ```ts
 * throw new DuplicatePredicateRegistrationError('shopDomain');
 * ```
 */
export class DuplicatePredicateRegistrationError extends GenericError {
    name = 'DuplicatePredicateRegistrationError';
    details = 'Duplicate predicate registration';
    description = 'A predicate with the given name is already registered';
    code = GenericErrorKind.GENERIC_DUPLICATE_PREDICATE_REGISTRATION;

    constructor(predicateName?: string) {
        super();
        if (predicateName) {
            this.description = this.description.replace('the given name', `name "${predicateName}"`);
        }
    }
}

/**
 * Signals that code requiring an active request scope was called outside of one.
 *
 * @example
 * ```ts
 * throw new MissingRequestContextError();
 * ```
 */
export class MissingRequestContextError extends GenericError {
    name = 'MissingRequestContextError';
    details = 'Missing request context';
    description = 'No request context is available; this code path requires an active request scope';
    code = GenericErrorKind.GENERIC_MISSING_REQUEST_CONTEXT;
}

/**
 * Signals that a workspace slug is registered more than once, violating the global-uniqueness constraint across all apps and packages.
 *
 * @param slug - The duplicate slug; embedded in the description when provided.
 * @example
 * ```ts
 * throw new DuplicateWorkspaceSlugError('admin');
 * ```
 */
export class DuplicateWorkspaceSlugError extends GenericError {
    name = 'DuplicateWorkspaceSlugError';
    details = 'Duplicate workspace slug';
    description =
        'A workspace slug is duplicated; workspace names must be globally unique across apps/* and packages/**';
    code = GenericErrorKind.GENERIC_DUPLICATE_WORKSPACE_SLUG;

    constructor(slug?: string) {
        super();
        if (slug) {
            this.description = this.description.replace('A workspace slug', `Workspace slug "${slug}"`);
        }
    }
}

/**
 * Signals that no TypeDoc JSON output was found for the requested subpath, typically because the build has not been run.
 *
 * @param subpathKey - The package subpath key whose TypeDoc output is missing; embedded in the description when provided.
 * @param rootDir - The root directory that was searched; appended to the description when provided.
 * @param buildCommand - The command that should be run to generate the output; appended to the description when provided.
 * @example
 * ```ts
 * throw new MissingTypeDocOutputError('@nordcom/commerce-errors', './dist', 'pnpm build');
 * ```
 */
export class MissingTypeDocOutputError extends GenericError {
    name = 'MissingTypeDocOutputError';
    details = 'Missing TypeDoc output';
    description = 'No TypeDoc JSON output was found for the requested subpath';
    code = GenericErrorKind.GENERIC_MISSING_TYPEDOC_OUTPUT;

    constructor(subpathKey?: string, rootDir?: string, buildCommand?: string) {
        super();
        if (subpathKey) {
            this.description = this.description.replace('the requested subpath', `subpath "${subpathKey}"`);
        }
        if (rootDir) {
            this.description = `${this.description} in "${rootDir}"`;
        }
        if (buildCommand) {
            this.description = `${this.description}. Run \`${buildCommand}\` first.`;
        }
    }
}

/**
 * Returns all error code string values from both {@link GenericErrorKind} and {@link ApiErrorKind} enums in a single flat array.
 *
 * @returns An array of every `GenericErrorKind` and `ApiErrorKind` string value.
 * @example
 * ```ts
 * const codes = getAllErrorCodes();
 * // ['GENERIC_UNKNOWN_ERROR', 'GENERIC_TODO', ..., 'API_UNKNOWN_ERROR', ...]
 * ```
 */
export const getAllErrorCodes = () => {
    return [...Object.values(GenericErrorKind), ...Object.values(ApiErrorKind)];
};

/**
 * Maps a `GenericErrorKind` or `ApiErrorKind` code to its corresponding error class, enabling reconstruction of typed errors from serialized codes.
 *
 * @param code - A member of `GenericErrorKind` or `ApiErrorKind`; accepts the string enum values directly since both enums are string-valued.
 * @returns The error class constructor for the code, or `null` when the code is not recognized.
 * @example
 * ```ts
 * const ErrorClass = getErrorFromCode(ApiErrorKind.API_UNKNOWN_SHOP_DOMAIN);
 * if (ErrorClass) throw new ErrorClass();
 * ```
 */
export const getErrorFromCode = (
    code: GenericErrorKind | ApiErrorKind,
): typeof GenericError | typeof ApiError | null => {
    switch (code) {
        // Generic Errors.
        case GenericErrorKind.GENERIC_UNKNOWN_ERROR:
            return GenericError;
        case GenericErrorKind.GENERIC_TODO:
            return TodoError;
        case GenericErrorKind.NOT_FOUND:
            return NotFoundError;
        case GenericErrorKind.UNREACHABLE:
            return UnreachableError;
        case GenericErrorKind.INVALID_TYPE:
            return TypeError;
        case GenericErrorKind.MISSING_CONTEXT_PROVIDER:
            return MissingContextProviderError as unknown as typeof GenericError;
        case GenericErrorKind.NOT_CONNECTED_TO_DATABASE:
            return NotConnectedToDatabase;
        case GenericErrorKind.MISSING_SESSION_USER_ID:
            return MissingSessionUserIdError;
        case GenericErrorKind.GENERIC_MISSING_TENANT_FOR_SCOPED_COLLECTION:
            return MissingTenantForScopedCollectionError as unknown as typeof GenericError;
        case GenericErrorKind.GENERIC_EMPTY_TENANT_SCOPE:
            return EmptyTenantScopeError;
        case GenericErrorKind.GENERIC_MISSING_LIST_CONFIG:
            return MissingListConfigError as unknown as typeof GenericError;
        case GenericErrorKind.GENERIC_MISSING_CONVEX_BRIDGE:
            return MissingConvexBridgeError as unknown as typeof GenericError;
        case GenericErrorKind.GENERIC_CONVEX_OPERATOR_TOKEN_MINT:
            return ConvexOperatorTokenMintError as unknown as typeof GenericError;
        case GenericErrorKind.GENERIC_DUPLICATE_PREDICATE_REGISTRATION:
            return DuplicatePredicateRegistrationError as unknown as typeof GenericError;
        case GenericErrorKind.GENERIC_MISSING_REQUEST_CONTEXT:
            return MissingRequestContextError;
        case GenericErrorKind.GENERIC_DUPLICATE_WORKSPACE_SLUG:
            return DuplicateWorkspaceSlugError as unknown as typeof GenericError;
        case GenericErrorKind.GENERIC_MISSING_TYPEDOC_OUTPUT:
            return MissingTypeDocOutputError as unknown as typeof GenericError;

        // Api Errors.
        case ApiErrorKind.API_UNKNOWN_ERROR:
            return UnknownError;
        case ApiErrorKind.API_UNKNOWN_SHOP_DOMAIN:
            return UnknownShopDomainError as unknown as typeof ApiError;
        case ApiErrorKind.API_UNKNOWN_COMMERCE_PROVIDER:
            return UnknownCommerceProviderError;
        case ApiErrorKind.API_UNKNOWN_LOCALE:
            return UnknownLocaleError as unknown as typeof ApiError;
        case ApiErrorKind.API_INVALID_SHOP:
            return InvalidShopError;
        case ApiErrorKind.API_INVALID_SHOP_DOMAIN:
            return InvalidShopDomainError as unknown as typeof ApiError;
        case ApiErrorKind.API_INVALID_HANDLE:
            return InvalidHandleError as unknown as typeof ApiError;
        case ApiErrorKind.API_INVALID_ID:
            return InvalidIDError as unknown as typeof ApiError;
        case ApiErrorKind.API_INVALID_CART:
            return InvalidCartError;
        case ApiErrorKind.API_CART_NOT_FOUND:
            return CartNotFoundError as unknown as typeof ApiError;
        case ApiErrorKind.API_CART_USER_ERROR:
            return CartUserError as unknown as typeof ApiError;
        case ApiErrorKind.API_CART_PROVIDER_ERROR:
            return CartProviderError as unknown as typeof ApiError;
        case ApiErrorKind.API_TOO_MANY_REQUESTS:
            return TooManyRequestsError;
        case ApiErrorKind.API_METHOD_NOT_ALLOWED:
            return MethodNotAllowedError;
        case ApiErrorKind.API_IMAGE_NO_FRACTIONAL:
            return ImageNoFractionalError;
        case ApiErrorKind.API_IMAGE_OUT_OF_BOUNDS:
            return ImageOutOfBoundsError;
        case ApiErrorKind.API_NO_LOCALES_AVAILABLE:
            return NoLocalesAvailableError;
        case ApiErrorKind.API_INVALID_SHOPIFY_CUSTOMER_ACCOUNT_API_CONFIGURATION:
            return InvalidShopifyCustomerAccountsApiConfiguration;
        case ApiErrorKind.API_MISSING_ENVIRONMENT_VARIABLE:
            return MissingEnvironmentVariableError as unknown as typeof ApiError;
        case ApiErrorKind.API_PROVIDER_FETCH_FAILED:
            return ProviderFetchError;
        case ApiErrorKind.API_SHOPIFY_GRAPHQL_DUPLICATE_CONTEXT_DIRECTIVE:
            return DuplicateContextDirectiveError as unknown as typeof ApiError;
        case ApiErrorKind.API_SHOPIFY_GRAPHQL_DUPLICATE_CONTEXT_VARIABLE:
            return DuplicateContextVariableError as unknown as typeof ApiError;
        case ApiErrorKind.API_UNKNOWN_SHOP_ID:
            return UnknownShopIdError as unknown as typeof ApiError;
        case ApiErrorKind.API_SHOP_MISCONFIGURATION:
            return ShopMisconfigurationError as unknown as typeof ApiError;
        case ApiErrorKind.API_MALFORMED_FORM_PAYLOAD:
            return MalformedFormPayloadError;
        case ApiErrorKind.API_UNKNOWN_COLLECTION_SLUG:
            return UnknownCollectionSlugError as unknown as typeof ApiError;
        case ApiErrorKind.API_NO_LOCALE_RESOLVABLE:
            return NoLocaleResolvableError as unknown as typeof ApiError;
        case ApiErrorKind.API_MISSING_UPLOAD_FILE:
            return MissingUploadFileError;
        case ApiErrorKind.API_EMPTY_UPLOAD_FILE:
            return EmptyUploadFileError;
        case ApiErrorKind.API_MISSING_REQUIRED_FIELD:
            return MissingRequiredFieldError as unknown as typeof ApiError;
        case ApiErrorKind.API_UNSUPPORTED_UPLOAD_MIME_TYPE:
            return UnsupportedUploadMimeTypeError as unknown as typeof ApiError;
        case ApiErrorKind.API_MEDIA_STORAGE_UPLOAD_FAILED:
            return MediaStorageUploadError as unknown as typeof ApiError;
    }
};
