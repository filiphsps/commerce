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
        const args = [...arguments].splice(0, 1);
        super(message, ...args);

        Object.defineProperty(this, 'help', {
            get: function () {
                return `https://shops.nordcom.io/docs/errors/${this.code}/`;
            },
            enumerable: true,
            configurable: false
        });
        Object.setPrototypeOf(this, Error.prototype);
    }

    public is(error: Error | unknown): boolean {
        if (!(error instanceof Error)) {
            return false;
        }

        return this.code === error.code;
    }

    public static isError(error: Error | unknown): boolean {
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

        const message = (error as any)?.message as string | undefined;
        if (!message) {
            return false;
        }

        const isPrismic404 = message.match(/no documents were returned/i);
        if (isPrismic404) {
            return true;
        }

        return false;
    }
}

export enum ApiErrorKind {
    API_UNKNOWN_ERROR = 'API_UNKNOWN_ERROR',
    API_UNKNOWN_SHOP_DOMAIN = 'API_UNKNOWN_SHOP_DOMAIN',
    API_UNKNOWN_COMMERCE_PROVIDER = 'API_UNKNOWN_COMMERCE_PROVIDER',
    API_UNKNOWN_CONTENT_PROVIDER = 'API_UNKNOWN_CONTENT_PROVIDER',
    API_UNKNOWN_LOCALE = 'API_UNKNOWN_LOCALE',
    API_INVALID_SHOP = 'API_INVALID_SHOP',
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
    API_PROVIDER_FETCH_FAILED = 'API_PROVIDER_FETCH_FAILED'
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
}
export class UnknownCommerceProviderError extends UnknownError {
    name = 'UnknownCommerceProviderError';
    details = 'Unknown commerce provider';
    description = 'Could not find a commerce provider with the given type';
    code = ApiErrorKind.API_UNKNOWN_COMMERCE_PROVIDER;
}
export class UnknownContentProviderError extends UnknownError {
    name = 'UnknownContentProviderError';
    details = 'Unknown content provider';
    description = 'Could not find a content provider with the given type';
    code = ApiErrorKind.API_UNKNOWN_CONTENT_PROVIDER;
}
export class UnknownLocaleError extends UnknownError {
    statusCode = 404;
    name = 'UnknownLocaleError';
    details = 'Unknown locale';
    description = 'Unsupported or invalid locale code was provided';
    code = ApiErrorKind.API_UNKNOWN_LOCALE;
}

export class InvalidShopError extends ApiError {
    statusCode = 400;
    name = 'InvalidShopError';
    details = 'Invalid shop';
    description = 'The current shop is invalid';
    code = ApiErrorKind.API_INVALID_SHOP;
}
export class InvalidHandleError extends ApiError {
    statusCode = 404;
    name = 'InvalidHandleError';
    details = 'Invalid handle';
    description = 'The handle is invalid';
    code = ApiErrorKind.API_INVALID_HANDLE;

    constructor(handle?: string) {
        super();

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

    constructor(id?: any) {
        super();

        if (typeof id !== undefined && id !== null) {
            this.description = this.description.replace('ID', `ID "${id?.toString?.() || id}"`);
        }
    }
}
export class InvalidSliceVariationError extends ApiError {
    statusCode = 404;
    name = 'InvalidSliceVariationError';
    details = 'Invalid slice variation';
    description = 'The slice variation is invalid';
    code = ApiErrorKind.API_INVALID_SLICE_VARIATION;

    constructor(variation?: any, slice?: any) {
        super();

        if (typeof slice !== undefined && slice !== null) {
            this.description = this.description.replace('slice', `slice "${slice?.toString?.() || slice}"`);
        }
        if (typeof variation !== undefined && variation !== null) {
            this.description = this.description.replace(
                'variation',
                `variation "${variation?.toString?.() || variation}"`
            );
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
    description = `${!!this.cause ? 'the' : 'A'} required environment variable ${!!this.cause ? `"${this.cause}"` : ''} is missing`;
    code = ApiErrorKind.API_MISSING_ENVIRONMENT_VARIABLE;
}

export class ProviderFetchError extends ApiError {
    statusCode = 500;
    name = 'ProviderFetchError';
    details = 'Failed to fetch from source';
    description = 'Failed to fetch from source';
    code = ApiErrorKind.API_PROVIDER_FETCH_FAILED;

    static stringifyInput(input: any): string | null {
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

        if (typeof input === 'object') {
            if ('message' in input && 'name' in input) {
                if ('toString' in input && typeof input.toString === 'function') {
                    return input.toString();
                }

                return `${input.name}: ${input.message}`;
            }

            if ('status' in input) {
                if ('statusText' in input) {
                    return `${input.status}: ${input.statusText}`;
                }

                return input.status;
            }
        }

        return null;
    }

    constructor(sourceErrors?: any) {
        super();

        this.cause = ProviderFetchError.stringifyInput(sourceErrors);
    }
}

export enum GenericErrorKind {
    GENERIC_UNKNOWN_ERROR = 'GENERIC_UNKNOWN_ERROR',
    GENERIC_TODO = 'GENERIC_TODO',
    NOT_FOUND = 'NOT_FOUND',
    UNREACHABLE = 'UNREACHABLE',
    INVALID_TYPE = 'INVALID_TYPE',
    MISSING_CONTEXT_PROVIDER = 'MISSING_CONTEXT_PROVIDER',
    NOT_CONNECTED_TO_DATABASE = 'NOT_CONNECTED_TO_DATABASE'
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

export const getAllErrorCodes = () => {
    return [...Object.values(GenericErrorKind), ...Object.values(ApiErrorKind)];
};

export const getErrorFromCode = (
    code: GenericErrorKind | ApiErrorKind
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
            return MissingContextProviderError as any;
        case GenericErrorKind.NOT_CONNECTED_TO_DATABASE:
            return NotConnectedToDatabase;

        // Api Errors.
        case ApiErrorKind.API_UNKNOWN_ERROR:
            return UnknownError;
        case ApiErrorKind.API_UNKNOWN_SHOP_DOMAIN:
            return UnknownShopDomainError;
        case ApiErrorKind.API_UNKNOWN_COMMERCE_PROVIDER:
            return UnknownCommerceProviderError;
        case ApiErrorKind.API_UNKNOWN_CONTENT_PROVIDER:
            return UnknownContentProviderError;
        case ApiErrorKind.API_UNKNOWN_LOCALE:
            return UnknownLocaleError;
        case ApiErrorKind.API_INVALID_SHOP:
            return InvalidShopError;
        case ApiErrorKind.API_INVALID_HANDLE:
            return InvalidHandleError;
        case ApiErrorKind.API_INVALID_ID:
            return InvalidIDError;
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
            return MissingEnvironmentVariableError;
        case ApiErrorKind.API_PROVIDER_FETCH_FAILED:
            return ProviderFetchError;
    }

    // eslint-disable-next-line no-unreachable
    return null;
};
