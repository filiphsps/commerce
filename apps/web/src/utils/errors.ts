/* c8 ignore start */
export class CommerceError<T = unknown> extends Error {
    public readonly name!: string;
    public readonly details!: string;
    public readonly code!: T;

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
    | 'API_TOO_MANY_REQUESTS'
    | 'API_METHOD_NOT_ALLOWED'
    | 'API_ICON_WIDTH_NO_FRACTIONAL'
    | 'API_ICON_WIDTH_OUT_OF_BOUNDS'
    | 'API_ICON_HEIGHT_NO_FRACTIONAL'
    | 'API_ICON_HEIGHT_OUT_OF_BOUNDS';
export class ApiError extends CommerceError<ApiErrorKind> {
    public statusCode: number = 400;
    name = 'Unknown APIError';
    details = 'An unknown error occurred';
    code = 'API_UNKNOWN_ERROR' as ApiErrorKind;
}

export class UnknownApiError extends ApiError {}

export class UnknownShopDomainError extends ApiError {
    name = 'Unknown shop domain';
    details = 'Could not find a shop with the given domain';
    code = 'API_UNKNOWN_SHOP_DOMAIN' as const;
}

export class UnknownCommerceProviderError extends ApiError {
    name = 'Unknown commerce provider';
    details = 'Could not find a commerce provider with the given type';
    code = 'API_UNKNOWN_COMMERCE_PROVIDER' as const;
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
        case 405:
            return MethodNotAllowedError;
        case 429:
            return TooManyRequestsError;
    }

    return ApiError;
};

export type GenericErrorKind = 'GENERIC_UNKNOWN_ERROR' | 'GENERIC_TODO';
export class GenericError extends CommerceError<GenericErrorKind> {
    name = 'Unknown APIError';
    details = 'An unknown error occurred';
    code = 'GENERIC_UNKNOWN_ERROR' as GenericErrorKind;
}
export class TodoError extends GenericError {
    name = 'TODO';
    details = 'This feature is not implemented yet';
    code = 'GENERIC_TODO' as const;
}

/* c8 ignore stop */
