import { NotFoundError as PrismicNotFoundError } from '@prismicio/client';
import { BuiltinError } from './error';

export class Error<T = unknown> extends BuiltinError {
    public readonly name!: string;
    public readonly details!: string;
    public readonly code!: T;
    public readonly statusCode?: number;
    // Defined in the constructor using `Object.defineProperty`.
    public readonly help!: string;

    public constructor() {
        super(...arguments);

        Object.defineProperty(this, 'help', {
            get: function () {
                return `https://shops.nordcom.io/docs/errors/${this.code}/`;
            },
            enumerable: true,
            configurable: false
        });
        Object.setPrototypeOf(this, Error.prototype);
    }

    public isNotFoundError(): boolean {
        return Error.isNotFound(this);
    }

    public static isNotFound(error: Error | unknown): boolean {
        switch (true) {
            case error instanceof PrismicNotFoundError:
            case error instanceof NotFoundError:
                return true;

            // TODO: Default should return false.
            default:
                break;
        }

        return (
            (error as any).statusCode === 404 ||
            ['No documents', '404:'].some((e) => (((error as any)?.message as string) || '').includes(e))
        );
    }
}

export enum ApiErrorKind {
    API_UNKNOWN_ERROR = 'API_UNKNOWN_ERROR',
    API_UNKNOWN_SHOP_DOMAIN = 'API_UNKNOWN_SHOP_DOMAIN',
    API_UNKNOWN_COMMERCE_PROVIDER = 'API_UNKNOWN_COMMERCE_PROVIDER',
    API_UNKNOWN_LOCALE = 'API_UNKNOWN_LOCALE',
    API_TOO_MANY_REQUESTS = 'API_TOO_MANY_REQUESTS',
    API_METHOD_NOT_ALLOWED = 'API_METHOD_NOT_ALLOWED',
    API_ICON_WIDTH_NO_FRACTIONAL = 'API_ICON_WIDTH_NO_FRACTIONAL',
    API_ICON_WIDTH_OUT_OF_BOUNDS = 'API_ICON_WIDTH_OUT_OF_BOUNDS',
    API_ICON_HEIGHT_NO_FRACTIONAL = 'API_ICON_HEIGHT_NO_FRACTIONAL',
    API_ICON_HEIGHT_OUT_OF_BOUNDS = 'API_ICON_HEIGHT_OUT_OF_BOUNDS',
    API_NO_LOCALES_AVAILABLE = 'API_NO_LOCALES_AVAILABLE'
}

export class ApiError extends Error<ApiErrorKind> {
    statusCode = 400;
    name = 'Unknown Error';
    details = 'An unknown error occurred';
    code = ApiErrorKind.API_UNKNOWN_ERROR;

    constructor(cause?: string) {
        super();

        if (cause) {
            this.cause = cause;
        }
    }
}

export class UnknownApiError extends ApiError {
    statusCode = 404;
}
export class UnknownShopDomainError extends UnknownApiError {
    name = 'Unknown shop domain';
    details = 'Could not find a shop with the given domain';
    code = ApiErrorKind.API_UNKNOWN_SHOP_DOMAIN;
}
export class UnknownCommerceProviderError extends UnknownApiError {
    name = 'Unknown commerce provider';
    details = 'Could not find a commerce provider with the given type';
    code = ApiErrorKind.API_UNKNOWN_COMMERCE_PROVIDER;
}
export class UnknownLocaleError extends UnknownApiError {
    name = 'Unknown locale';
    details = 'Unsupported or invalid locale code was provided';
    code = ApiErrorKind.API_UNKNOWN_LOCALE;
}

export class TooManyRequestsError extends ApiError {
    statusCode = 429;
    name = 'Too many requests';
    details = 'You are being rate limited';
    code = ApiErrorKind.API_TOO_MANY_REQUESTS;
}

export class MethodNotAllowedError extends ApiError {
    statusCode = 405;
    name = 'Method not allowed';
    details = 'The endpoint does not support the given method';
    code = ApiErrorKind.API_METHOD_NOT_ALLOWED;
}

export class IconWidthNoFractionalError extends ApiError {
    name = 'Invalid width';
    details = '`width` must be an integer';
    code = ApiErrorKind.API_ICON_WIDTH_NO_FRACTIONAL;
}
export class IconWidthOutOfBoundsError extends ApiError {
    name = 'Width is out of bounds';
    details = '`width` must be between `1` and `1024` or `undefined`';
    code = ApiErrorKind.API_ICON_WIDTH_OUT_OF_BOUNDS;
}
export class IconHeightNoFractionalError extends ApiError {
    name = 'Invalid width';
    details = '`width` must be an integer';
    code = ApiErrorKind.API_ICON_HEIGHT_NO_FRACTIONAL;
}
export class IconHeightOutOfBoundsError extends ApiError {
    name = 'Height is out of bounds';
    details = '`height` must be between `1` and `1024` or `undefined`';
    code = ApiErrorKind.API_ICON_HEIGHT_OUT_OF_BOUNDS;
}

export class NoLocalesAvailableError extends ApiError {
    statusCode = 404;
    name = 'No locales available';
    details = 'No locales have been configured for the requested shop instance';
    code = ApiErrorKind.API_NO_LOCALES_AVAILABLE;
}

export type ApiErrorStatusCode = 400 | 405 | 429 | number;
export const getErrorFromStatusCode = (statusCode: ApiErrorStatusCode) => {
    switch (statusCode) {
        case 400:
            return ApiError;
        case 404:
            return NotFoundError;
        case 405:
            return MethodNotAllowedError;
        case 429:
            return TooManyRequestsError;
    }

    return ApiError;
};

export enum GenericErrorKind {
    GENERIC_UNKNOWN_ERROR = 'GENERIC_UNKNOWN_ERROR',
    GENERIC_TODO = 'GENERIC_TODO',
    NOT_FOUND = 'NOT_FOUND',
    UNREACHABLE = 'UNREACHABLE',
    INVALID_TYPE = 'INVALID_TYPE'
}

export class GenericError extends Error<GenericErrorKind> {
    statusCode = 500;
    name = 'Unknown Error';
    details = 'An unknown error occurred';
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
    name = 'TODO';
    details = 'This feature is not implemented yet';
    code = GenericErrorKind.GENERIC_TODO;
}
export class NotFoundError extends GenericError {
    statusCode = 404;
    name = 'Not Found';
    details = 'The requested resource could not be found';
    code = GenericErrorKind.NOT_FOUND;

    constructor(requestedResource?: string) {
        super();

        if (requestedResource) {
            this.cause = this.details.replace('resource', `resource "${requestedResource}"`);
        }
    }
}
export class UnreachableError extends GenericError {
    name = 'Unreachable';
    details = 'Supposedly unreachable code-path taken';
    code = GenericErrorKind.UNREACHABLE;
}
export class TypeError extends GenericError {
    name = 'TypeError';
    details = 'Invalid type was passed to function';
    code = GenericErrorKind.INVALID_TYPE;
}

export const getErrorFromCode = (code: GenericErrorKind | ApiErrorKind) => {
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

        // Api Errors.
        case ApiErrorKind.API_UNKNOWN_ERROR:
            return ApiError;
        case ApiErrorKind.API_UNKNOWN_SHOP_DOMAIN:
            return UnknownShopDomainError;
        case ApiErrorKind.API_UNKNOWN_COMMERCE_PROVIDER:
            return UnknownCommerceProviderError;
        case ApiErrorKind.API_UNKNOWN_LOCALE:
            return UnknownLocaleError;
        case ApiErrorKind.API_TOO_MANY_REQUESTS:
            return TooManyRequestsError;
        case ApiErrorKind.API_METHOD_NOT_ALLOWED:
            return MethodNotAllowedError;
        case ApiErrorKind.API_ICON_WIDTH_NO_FRACTIONAL:
            return IconWidthNoFractionalError;
        case ApiErrorKind.API_ICON_WIDTH_OUT_OF_BOUNDS:
            return IconWidthOutOfBoundsError;
        case ApiErrorKind.API_ICON_HEIGHT_NO_FRACTIONAL:
            return IconHeightNoFractionalError;
        case ApiErrorKind.API_ICON_HEIGHT_OUT_OF_BOUNDS:
            return IconHeightOutOfBoundsError;
        case ApiErrorKind.API_NO_LOCALES_AVAILABLE:
            return NoLocalesAvailableError;
    }

    return null;
};

/**
 * @deprecated Use {@link Error.isNotFound} instead.
 */
export const isNotFoundError = (error: Error | unknown): boolean => {
    return Error.isNotFound(error);
};
