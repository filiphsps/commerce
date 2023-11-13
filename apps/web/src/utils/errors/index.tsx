export class CommerceError<T = unknown> extends Error {
    readonly name!: string;
    readonly details!: string;
    readonly code!: T;

    toString() {
        return 'toString';
    }

    constructor() {
        super(...arguments);

        Object.setPrototypeOf(this, CommerceError.prototype);
    }

    get help() {
        return `https://shops.nordcom.io/docs/errors/${this.code}/`;
    }
}

export type ApiErrorKind =
    | 'ICON_WIDTH_NO_FRACTIONAL'
    | 'ICON_WIDTH_OUT_OF_BOUNDS'
    | 'ICON_HEIGHT_NO_FRACTIONAL'
    | 'ICON_HEIGHT_OUT_OF_BOUNDS';
export class ApiError extends CommerceError<ApiErrorKind> {
    readonly statusCode: number = 400;
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
