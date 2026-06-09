/**
 * Public surface of the rich-text codec (CMSRICH-04). Exposed as the
 * `@nordcom/commerce-cms/editor/richtext` subpath so consumers outside the
 * editor (the migration ETL, the storefront's golden-parity tests, and the
 * storefront renderer's type imports) can reach the pure codec without
 * pulling the Tiptap-based editor UI into their module graph.
 */
export {
    type LexicalDocument,
    lexicalToProseMirror,
    type ProseMirrorDocument,
    type ProseMirrorMark,
    type ProseMirrorNode,
} from './lexical-to-prosemirror';
