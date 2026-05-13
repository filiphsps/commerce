declare const brand: unique symbol;
export type Brand<T> = { readonly [brand]: T };

export type ParamType = Brand<string> | Brand<number>;

export type ParamTypeShape<P extends ParamType> = P extends Brand<infer S> ? S : never;

export type ParamMap = Record<string, ParamType>;

export type ParamValues<P extends ParamMap | undefined> = P extends ParamMap
    ? { [K in keyof P]: ParamTypeShape<P[K]> }
    : {};

export interface EntityDecl<
    P extends ParamMap | undefined = undefined,
    R extends readonly string[] = readonly never[],
> {
    params?: P;
    parents?: R;
}

export const str = {} as Brand<string>;
export const num = {} as Brand<number>;
