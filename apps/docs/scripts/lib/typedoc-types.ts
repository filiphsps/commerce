/** Subset of TypeDoc's serialised project shape — we read what we need, type-safely. */
export type TypeDocSymbol = {
    id: number;
    name: string;
    kind: number;
    flags?: { isInternal?: boolean; isOptional?: boolean; isReadonly?: boolean };
    signatures?: TypeDocSignature[];
    comment?: TypeDocComment;
    sources?: { fileName: string; line: number; url?: string }[];
    type?: TypeDocType;
    children?: TypeDocSymbol[];
};

export type TypeDocSignature = {
    id: number;
    name: string;
    kind: number;
    comment?: TypeDocComment;
    parameters?: { id: number; name: string; type?: TypeDocType; comment?: TypeDocComment }[];
    type?: TypeDocType;
};

/**
 * TypeDoc's serialised type shape. The `type` discriminator selects which
 * other fields are populated — TypeDoc covers ~15 type kinds (intrinsic,
 * reference, union, intersection, array, literal, reflection, tuple,
 * templateLiteral, query, predicate, typeOperator, indexedAccess,
 * conditional, mapped). We model them as optional so `typeToString` can
 * render any node without runtime type narrowing per branch.
 */
export type TypeDocType = {
    type: string;
    name?: string;
    target?: number | { qualifiedName?: string };
    typeArguments?: TypeDocType[];
    types?: TypeDocType[];
    elementType?: TypeDocType;
    elements?: TypeDocType[];
    value?: string | number | boolean | null;
    declaration?: {
        children?: { name: string; type?: TypeDocType }[];
        signatures?: TypeDocSignature[];
    };
    queryType?: TypeDocType;
    targetType?: TypeDocType;
    operator?: string;
    objectType?: TypeDocType;
    indexType?: TypeDocType;
    checkType?: TypeDocType;
    extendsType?: TypeDocType;
    trueType?: TypeDocType;
    falseType?: TypeDocType;
    head?: string;
    tail?: { type: TypeDocType; text: string }[];
};

export type TypeDocComment = {
    summary?: TypeDocCommentNode[];
    blockTags?: { tag: string; content: TypeDocCommentNode[] }[];
    modifierTags?: string[];
};

export type TypeDocCommentNode = { kind: 'text' | 'code' | 'inlineTag'; text: string; tag?: string; target?: string };

export type TypeDocProject = {
    name: string;
    children?: TypeDocSymbol[];
};

/** TypeDoc ReflectionKind values — see node_modules/typedoc/dist/lib/models/kind.d.ts */
export const KIND_FUNCTION = 64;
export const KIND_CLASS = 128;
export const KIND_INTERFACE = 256;
export const KIND_VARIABLE = 32;
export const KIND_TYPE_ALIAS = 2097152;
export const KIND_ENUM = 8;
