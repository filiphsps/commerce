/* c8 ignore start */
export class CommerceError<T = unknown> extends Error {
    public readonly name!: string;
    public readonly details!: string;
    public readonly code!: T;
    public readonly statusCode?: number;

    public constructor() {
        super(...arguments);

        Object.setPrototypeOf(this, CommerceError.prototype);
        Object.defineProperty(this, 'help', {
            get: function () {
                return `https://shops.nordcom.io/docs/errors/${this.code}/`;
            },
            enumerable: true,
            configurable: false
        });
    }

    public help!: string; // Defined in the constructor using `Object.defineProperty`.
}

export type ApiErrorKind =
    | 'API_UNKNOWN_ERROR'
    | 'API_UNKNOWN_SHOP_DOMAIN'
    | 'API_UNKNOWN_COMMERCE_PROVIDER'
    | 'API_UNKNOWN_LOCALE'
    | 'API_TOO_MANY_REQUESTS'
    | 'API_METHOD_NOT_ALLOWED'
    | 'API_ICON_WIDTH_NO_FRACTIONAL'
    | 'API_ICON_WIDTH_OUT_OF_BOUNDS'
    | 'API_ICON_HEIGHT_NO_FRACTIONAL'
    | 'API_ICON_HEIGHT_OUT_OF_BOUNDS';
export class ApiError extends CommerceError<ApiErrorKind> {
    statusCode = 400;
    name = 'Unknown Error';
    details = 'An unknown error occurred';
    code = 'API_UNKNOWN_ERROR' as ApiErrorKind;
}

export class UnknownApiError extends ApiError {
    statusCode = 404;
}
export class UnknownShopDomainError extends UnknownApiError {
    name = 'Unknown shop domain';
    details = 'Could not find a shop with the given domain';
    code = 'API_UNKNOWN_SHOP_DOMAIN' as const;
}
export class UnknownCommerceProviderError extends UnknownApiError {
    name = 'Unknown commerce provider';
    details = 'Could not find a commerce provider with the given type';
    code = 'API_UNKNOWN_COMMERCE_PROVIDER' as const;
}
export class UnknownLocaleError extends UnknownApiError {
    name = 'Unknown locale';
    details = 'Unsupported or invalid locale code was provided';
    code = 'API_UNKNOWN_LOCALE' as const;
}

export class TooManyRequestsError extends ApiError {
    statusCode = 429;
    name = 'Too many requests';
    details = 'You are being rate limited';
    code = 'API_TOO_MANY_REQUESTS' as const;
}

export class MethodNotAllowedError extends ApiError {
    statusCode = 405;
    name = 'Method not allowed';
    details = 'The endpoint does not support the given method';
    code = 'API_METHOD_NOT_ALLOWED' as const;
}

export class IconWidthNoFractionalError extends ApiError {
    name = 'Invalid width';
    details = '`width` must be an integer';
    code = 'API_ICON_WIDTH_NO_FRACTIONAL' as const;
}
export class IconWidthOutOfBoundsError extends ApiError {
    name = 'Width is out of bounds';
    details = '`width` must be between `1` and `1024` or `undefined`';
    code = 'API_ICON_WIDTH_OUT_OF_BOUNDS' as const;
}
export class IconHeightNoFractionalError extends ApiError {
    name = 'Invalid width';
    details = '`width` must be an integer';
    code = 'API_ICON_HEIGHT_NO_FRACTIONAL' as const;
}
export class IconHeightOutOfBoundsError extends ApiError {
    name = 'Height is out of bounds';
    details = '`height` must be between `1` and `1024` or `undefined`';
    code = 'API_ICON_HEIGHT_OUT_OF_BOUNDS' as const;
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

export type GenericErrorKind = 'GENERIC_UNKNOWN_ERROR' | 'GENERIC_TODO' | 'NOT_FOUND';
export class GenericError extends CommerceError<GenericErrorKind> {
    statusCode = 500;
    name = 'Unknown Error';
    details = 'An unknown error occurred';
    code = 'GENERIC_UNKNOWN_ERROR' as GenericErrorKind;
}
export class TodoError extends GenericError {
    name = 'TODO';
    details = 'This feature is not implemented yet';
    code = 'GENERIC_TODO' as const;
}
export class NotFoundError extends GenericError {
    statusCode = 404;
    name = 'Not Found';
    details = 'The requested resource could not be found';
    code = 'NOT_FOUND' as const;
}

export const isNotFoundError = (error: GenericError | unknown): boolean =>
    (error as any).statusCode === 404 ||
    ['No documents', '404:'].some((e) => (((error as any)?.message as string) || '').includes(e));

/* c8 ignore stop */
