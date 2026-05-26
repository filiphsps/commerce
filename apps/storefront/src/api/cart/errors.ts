import { ApiError, ApiErrorKind } from '@nordcom/commerce-errors';

export class CartNotFoundError extends ApiError {
    override statusCode = 404;
    override name = 'CartNotFoundError';
    override details = 'Cart not found';
    override description = 'The requested cart could not be found';
    code = ApiErrorKind.API_INVALID_CART;

    constructor(cartId: string) {
        super();
        this.description = `Cart "${cartId}" not found.`;
    }
}

export class CartProviderError extends ApiError {
    override statusCode = 502;
    override name = 'CartProviderError';
    override details = 'Cart provider error';
    override description = 'The cart provider returned an error';
    code = ApiErrorKind.API_PROVIDER_FETCH_FAILED;

    public readonly providerCause?: unknown;

    constructor(message: string, providerCause?: unknown) {
        super();
        this.description = message;
        this.providerCause = providerCause;
    }
}

export class CartUserError extends ApiError {
    override statusCode = 400;
    override name = 'CartUserError';
    override details = 'Cart user error';
    override description = 'The cart provider rejected the request with user-facing errors';
    code = ApiErrorKind.API_INVALID_CART;

    public readonly userErrors: Array<{ field?: string; message: string }>;

    constructor(userErrors: Array<{ field?: string; message: string }>) {
        super();
        this.userErrors = userErrors;
        this.description = userErrors[0]?.message ?? 'Cart user error';
    }
}
