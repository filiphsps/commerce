import { BuiltinError } from './error';

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
        Object.setPrototypeOf(this, Error.prototype);
    }

    public is(error: Error | unknown): boolean {
        if (!(error instanceof Error)) {
            return false;
        }

        return this.code === error.code;
    }

    public static override isError(error: unknown): error is Error {
        return error instanceof Error;
    }

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

export enum ApiErrorKind {
    API_UNKNOWN_ERROR = 'API_UNKNOWN_ERROR',
    API_UNKNOWN_SHOP_DOMAIN = 'API_UNKNOWN_SHOP_DOMAIN',
    API_UNKNOWN_COMMERCE_PROVIDER = 'API_UNKNOWN_COMMERCE_PROVIDER',
    API_UNKNOWN_LOCALE = 'API_UNKNOWN_LOCALE',
    API_INVALID_SHOP = 'API_INVALID_SHOP',
    API_INVALID_SHOP_DOMAIN = 'API_INVALID_SHOP_DOMAIN',
    API_INVALID_HANDLE = 'API_INVALID_HANDLE',
    API_INVALID_ID = 'API_INVALID_ID',
    API_INVALID_SLICE_VARIATION = 'API_INVALID_SLICE_VARIATION',
    API_INVALID_CART = 'API_INVALID_CART',
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
}

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

export class UnknownError extends ApiError {
    name = 'UnknownError';
    details = 'Unknown Error';
    description = 'An unknown error occurred';
    code = ApiErrorKind.API_UNKNOWN_ERROR;
}
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
export class UnknownCommerceProviderError extends UnknownError {
    name = 'UnknownCommerceProviderError';
    details = 'Unknown commerce provider';
    description = 'Could not find a commerce provider with the given type';
    code = ApiErrorKind.API_UNKNOWN_COMMERCE_PROVIDER;
}
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

export class InvalidShopError extends ApiError {
    statusCode = 400;
    name = 'InvalidShopError';
    details = 'Invalid shop';
    description = 'The current shop is invalid';
    code = ApiErrorKind.API_INVALID_SHOP;
}
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
export class InvalidSliceVariationError extends ApiError {
    statusCode = 404;
    name = 'InvalidSliceVariationError';
    details = 'Invalid slice variation';
    description = 'The slice variation is invalid';
    code = ApiErrorKind.API_INVALID_SLICE_VARIATION;

    constructor(variation?: unknown, slice?: unknown, cause?: string, statusCode?: number) {
        super(cause, statusCode);

        if (slice !== undefined && slice !== null) {
            this.description = this.description.replace('slice', `slice "${String(slice)}"`);
        }

        if (variation !== undefined && variation !== null) {
            this.description = this.description.replace('variation', `variation "${String(variation)}"`);
        }
    }
}
export class InvalidCartError extends ApiError {
    statusCode = 404;
    name = 'InvalidCartError';
    details = 'Invalid cart';
    description = 'The cart is invalid';
    code = ApiErrorKind.API_INVALID_CART;
}

export class TooManyRequestsError extends ApiError {
    statusCode = 429;
    name = 'TooManyRequestsError';
    details = 'Too many requests';
    description = 'You are being rate limited';
    code = ApiErrorKind.API_TOO_MANY_REQUESTS;
}

export class MethodNotAllowedError extends ApiError {
    statusCode = 405;
    name = 'MethodNotAllowedError';
    details = 'Method not allowed';
    description = 'The endpoint does not support the given method';
    code = ApiErrorKind.API_METHOD_NOT_ALLOWED;
}

export class ImageNoFractionalError extends ApiError {
    statusCode = 400;
    name = 'ImageNoFractionalError';
    details = 'Invalid width or height';
    description = '`width`/`height` must be an integer';
    code = ApiErrorKind.API_IMAGE_NO_FRACTIONAL;
}
export class ImageOutOfBoundsError extends ApiError {
    statusCode = 400;
    name = 'ImageOutOfBoundsError';
    details = 'Width or height is out of bounds';
    description = '`width`/`height` must be between `1` and `1024` or `undefined`';
    code = ApiErrorKind.API_IMAGE_OUT_OF_BOUNDS;
}

export class NoLocalesAvailableError extends ApiError {
    statusCode = 500;
    name = 'NoLocalesAvailableError';
    details = 'No locales available';
    description = 'No locales have been configured for the requested shop instance';
    code = ApiErrorKind.API_NO_LOCALES_AVAILABLE;
}

export class InvalidShopifyCustomerAccountsApiConfiguration extends ApiError {
    statusCode = 500;
    name = 'InvalidShopifyCustomerAccountsApiConfiguration';
    details = 'Invalid Shopify Customer Account API configuration';
    description = 'The Shopify Customer Account API configuration is invalid';
    code = ApiErrorKind.API_INVALID_SHOPIFY_CUSTOMER_ACCOUNT_API_CONFIGURATION;
}

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

export class ProviderFetchError extends ApiError {
    statusCode = 500;
    name = 'ProviderFetchError';
    details = 'Failed to fetch from source';
    description = 'Failed to fetch from source';
    code = ApiErrorKind.API_PROVIDER_FETCH_FAILED;

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

export class MissingUploadFileError extends ApiError {
    statusCode = 400;
    name = 'MissingUploadFileError';
    details = 'Missing upload file';
    description = 'No file was provided with the upload';
    code = ApiErrorKind.API_MISSING_UPLOAD_FILE;
}

export class EmptyUploadFileError extends ApiError {
    statusCode = 400;
    name = 'EmptyUploadFileError';
    details = 'Empty upload file';
    description = 'The uploaded file is empty';
    code = ApiErrorKind.API_EMPTY_UPLOAD_FILE;
}

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
    GENERIC_DUPLICATE_PREDICATE_REGISTRATION = 'GENERIC_DUPLICATE_PREDICATE_REGISTRATION',
    GENERIC_MISSING_REQUEST_CONTEXT = 'GENERIC_MISSING_REQUEST_CONTEXT',
    GENERIC_DUPLICATE_WORKSPACE_SLUG = 'GENERIC_DUPLICATE_WORKSPACE_SLUG',
    GENERIC_MISSING_TYPEDOC_OUTPUT = 'GENERIC_MISSING_TYPEDOC_OUTPUT',
}

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
export class TodoError extends GenericError {
    statusCode = 404; // TODO: This ain't really correct.
    name = 'TodoError';
    details = 'TODO';
    description = 'This feature is not implemented yet';
    code = GenericErrorKind.GENERIC_TODO;
}
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
export class UnreachableError extends GenericError {
    name = 'UnreachableError';
    details = 'Unreachable code-path taken';
    description = 'Supposedly unreachable code-path taken';
    code = GenericErrorKind.UNREACHABLE;
}
export class TypeError extends GenericError {
    name = 'TypeError';
    details = 'Invalid type';
    description = 'Invalid type was passed to function';
    code = GenericErrorKind.INVALID_TYPE;
}
export class MissingContextProviderError extends GenericError {
    name = 'MissingContextProviderError';
    details = 'Missing context provider';
    code = GenericErrorKind.MISSING_CONTEXT_PROVIDER;

    constructor(functionName: string, contextName: string) {
        super();

        this.description = `\`${functionName}()\` must be used within a \`<${contextName}/>\` provider.`;
    }
}
export class NotConnectedToDatabase extends GenericError {
    name = 'NotConnectedToDatabase';
    details = 'Not connected to the database';
    description = 'The instance provided does not have an active database connection.';
    code = GenericErrorKind.NOT_CONNECTED_TO_DATABASE;
}
export class MissingSessionUserIdError extends GenericError {
    statusCode = 500;
    name = 'MissingSessionUserIdError';
    details = 'Missing session user id';
    description = 'Authenticated session is missing a user id; check the auth adapter and the jwt/session callbacks';
    code = GenericErrorKind.MISSING_SESSION_USER_ID;
}

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

export class EmptyTenantScopeError extends GenericError {
    name = 'EmptyTenantScopeError';
    details = 'Empty tenant scope';
    description = 'A tenant-scoped query received an empty shop id; refusing to broaden the predicate';
    code = GenericErrorKind.GENERIC_EMPTY_TENANT_SCOPE;
}

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

export class MissingRequestContextError extends GenericError {
    name = 'MissingRequestContextError';
    details = 'Missing request context';
    description = 'No request context is available; this code path requires an active request scope';
    code = GenericErrorKind.GENERIC_MISSING_REQUEST_CONTEXT;
}

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

export const getAllErrorCodes = () => {
    return [...Object.values(GenericErrorKind), ...Object.values(ApiErrorKind)];
};

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
        case ApiErrorKind.API_INVALID_SLICE_VARIATION:
            return InvalidSliceVariationError;
        case ApiErrorKind.API_INVALID_CART:
            return InvalidCartError;
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
    }
};
