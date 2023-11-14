export class CommerceError<T = unknown> extends Error {
    readonly name!: string;
    readonly details!: string;
    readonly code!: T;

    constructor() {
        super(...arguments);

        Object.setPrototypeOf(this, CommerceError.prototype);
    }

    get help() {
        return `https://shops.nordcom.io/docs/errors/${this.code}/`;
    }
}

/* c8 ignore start */
export type ApiErrorKind =
    | 'UNKNOWN_ERROR'
    | 'TOO_MANY_REQUESTS'
    | 'ICON_WIDTH_NO_FRACTIONAL'
    | 'ICON_WIDTH_OUT_OF_BOUNDS'
    | 'ICON_HEIGHT_NO_FRACTIONAL'
    | 'ICON_HEIGHT_OUT_OF_BOUNDS';
export class ApiError extends CommerceError<ApiErrorKind> {
    statusCode: number = 400;
    name = 'Unknown API Error';
    details = 'An unknown error occurred';
    code = 'UNKNOWN_ERROR' as ApiErrorKind;
}

export class TooManyRequestsError extends ApiError {
    statusCode = 429;
    name = 'Too many requests';
    details = 'You are being rate limited';
    code = 'TOO_MANY_REQUESTS' as const;
}

export class IconWidthNoFractionalError extends ApiError {
    name = 'Invalid width';
    details = '`width` must be an integer';
    code = 'ICON_WIDTH_NO_FRACTIONAL' as const;
}
export class IconWidthOutOfBoundsError extends ApiError {
    name = 'Width is out of bounds';
    details = '`width` must be between `1` and `1024` or `undefined`';
    code = 'ICON_WIDTH_OUT_OF_BOUNDS' as const;
}
export class IconHeightNoFractionalError extends ApiError {
    name = 'Invalid width';
    details = '`width` must be an integer';
    code = 'ICON_HEIGHT_NO_FRACTIONAL' as const;
}
export class IconHeightOutOfBoundsError extends ApiError {
    name = 'Height is out of bounds';
    details = '`height` must be between `1` and `1024` or `undefined`';
    code = 'ICON_HEIGHT_OUT_OF_BOUNDS' as const;
}

export type ApiErrorStatusCode = 400 | 429 | number;
export const getErrorFromStatusCode = (statusCode: ApiErrorStatusCode) => {
    switch (statusCode) {
        case 400:
            return ApiError;
        case 429:
            return TooManyRequestsError;
    }

    return ApiError;
};
/* c8 ignore stop */
