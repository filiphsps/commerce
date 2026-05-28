/**
 * A single visual unit in a rendered type expression. Produced at gen time
 * by `typeToTokens`; consumed at runtime by `<PropsTable>`.
 */
export type TypeToken =
    | { t: 'ref'; text: string; href: string }
    | { t: 'kw'; text: string }
    | { t: 'lit'; text: string }
    | { t: 'op'; text: string };

/**
 * One property row for `<PropsTable>`. Serialised into the MDX JSX expression
 * at gen time and hydrated by the component at runtime.
 */
export type PropRow = {
    name: string;
    opt: boolean;
    tokens: TypeToken[];
    desc: string;
};
