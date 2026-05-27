/** Subset of TypeDoc's serialised project shape — we read what we need, type-safely. */
export type TypeDocSymbol = {
    id: number;
    name: string;
    kind: number;
    flags?: { isInternal?: boolean };
    signatures?: TypeDocSignature[];
    comment?: TypeDocComment;
    sources?: { fileName: string; line: number; url?: string }[];
    type?: TypeDocType;
};

export type TypeDocSignature = {
    id: number;
    name: string;
    kind: number;
    comment?: TypeDocComment;
    parameters?: { id: number; name: string; type?: TypeDocType; comment?: TypeDocComment }[];
    type?: TypeDocType;
};

export type TypeDocType = {
    type: string;
    name?: string;
    target?: number;
    typeArguments?: TypeDocType[];
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
