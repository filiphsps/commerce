/**
 * Descriptor-driven generator for `src/types/payload-types.ts`.
 *
 * Replaces `payload generate:types` (which booted Payload against a fake Mongo
 * adapter to walk its sanitized config). Instead this walks the SAME field
 * configs the CMS collections and blocks already build from the field
 * descriptors (`allCollections` / `allBlocks`) — plain data, no Payload runtime,
 * no Mongo — and emits the document and block content interfaces the eleven
 * storefront read getters consume.
 *
 * The non-descriptor Payload framework surface (the `Config` interface, every
 * `*Select<T>` helper, the `payload-*` internal collections, `SupportedTimezones`,
 * `UserAuthOperations`, `CollectionsWidget`, `Auth`, and the `GeneratedTypes`
 * augmentation) is carried verbatim from {@link SCAFFOLD_PREAMBLE} /
 * {@link SCAFFOLD_TAIL}: those encode Payload runtime/admin contracts the
 * descriptor DSL deliberately does not model, and the storefront read contract
 * (SFREAD-01) is frozen against the document/block shapes this module derives.
 *
 * Formatting is intentionally not byte-identical to Payload's prettier output —
 * the file is git-tracked and Biome-ignored, the drift gate diffs this emitter's
 * output against the committed file (not against Payload), and TypeScript treats
 * single-line and multi-line unions/objects as the same type. What MUST hold is
 * structural type equality on the consumed interfaces, which the SFREAD-01
 * snapshot + golden test gate on every typecheck.
 */
import { UnknownCollectionSlugError } from '@nordcom/commerce-errors';
import { allBlocks } from '../../src/blocks';
import { allCollections } from '../../src/collections';
import { SCAFFOLD_PREAMBLE, SCAFFOLD_TAIL } from './payload-scaffold';

/** Structural view of a Payload/descriptor field as walked by the emitter. */
type EmitField = {
    type: string;
    name?: string;
    label?: string;
    required?: boolean;
    hasMany?: boolean;
    relationTo?: string;
    options?: Array<{ value: string } | string>;
    fields?: EmitField[];
    blocks?: EmitBlock[];
};

/** Structural view of a Payload/descriptor block definition. */
type EmitBlock = {
    slug: string;
    interfaceName?: string;
    fields: EmitField[];
};

/**
 * Maps a collection slug to the TypeScript interface name Payload would emit for
 * its documents. Pinned explicitly because Payload's runtime singularizer
 * (`productMetadata` → `ProductMetadatum`, `feature-flags` → `FeatureFlag`) is
 * not reproduced here, and the storefront imports these exact names.
 */
const RELATION_INTERFACE: Record<string, string> = {
    users: 'User',
    media: 'Media',
    shops: 'Shop',
    'feature-flags': 'FeatureFlag',
    pages: 'Page',
    articles: 'Article',
    productMetadata: 'ProductMetadatum',
    collectionMetadata: 'CollectionMetadatum',
    reviews: 'Review',
    header: 'Header',
    footer: 'Footer',
    businessData: 'BusinessDatum',
};

const INDENT = '    ';

/**
 * Builds the indentation prefix for a nesting level.
 *
 * @param level - Zero-based nesting depth.
 * @returns `level` repetitions of the four-space indent unit.
 */
const pad = (level: number): string => INDENT.repeat(level);

/**
 * Resolves a select field's option values into a TypeScript string-literal union.
 *
 * @param options - The field's options, each a `{ value }` object or a bare string.
 * @returns A `'a' | 'b'` union, or `string` when no options are present.
 */
const selectUnion = (options: EmitField['options']): string => {
    if (!options || options.length === 0) return 'string';
    return options.map((opt) => `'${typeof opt === 'string' ? opt : opt.value}'`).join(' | ');
};

/** Loose-JSON value union Payload emits for `json` fields. */
const JSON_TYPE = '{ [k: string]: unknown } | unknown[] | string | number | boolean | null';

/** Lexical rich-text document shape Payload emits for `richText` fields. */
const RICHTEXT_TYPE =
    "{ root: { type: string; children: { type: any; version: number; [k: string]: unknown }[]; " +
    "direction: ('ltr' | 'rtl') | null; format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | ''; " +
    'indent: number; version: number }; [k: string]: unknown } | null';

/**
 * Determines whether a field forces its containing group to be a required (non-
 * optional) property. Mirrors Payload's behavior: a group is required iff it has
 * a transitively required scalar/relationship descendant reachable through
 * nested groups; arrays and blocks are always optional containers and break the
 * chain.
 *
 * @param field - The candidate child field.
 * @returns `true` when the field makes its parent group required.
 */
const forcesParentRequired = (field: EmitField): boolean => {
    if (field.type === 'array' || field.type === 'blocks') return false;
    if (field.type === 'collapsible') return (field.fields ?? []).some(forcesParentRequired);
    if (field.type === 'group') return (field.fields ?? []).some(forcesParentRequired);
    return Boolean(field.required);
};

/**
 * Emits the TypeScript properties for a list of fields at a given nesting level.
 * Presentational `collapsible` containers are flattened into the parent since
 * they carry no data key.
 *
 * @param fields - The fields to emit, in source order.
 * @param level - Current nesting depth (controls indentation).
 * @returns The joined, newline-separated property lines.
 */
const emitFields = (fields: EmitField[], level: number): string => {
    const lines: string[] = [];
    for (const field of fields) {
        if (field.type === 'collapsible') {
            const inner = emitFields(field.fields ?? [], level);
            if (inner) lines.push(inner);
            continue;
        }
        lines.push(emitProperty(field, level));
    }
    return lines.join('\n');
};

/**
 * Emits a single named field as a TypeScript interface property, including any
 * multi-line object/array/blocks body. Optionality and nullability follow
 * Payload's emission rules per field kind.
 *
 * @param field - The named field to emit.
 * @param level - Current nesting depth (controls indentation).
 * @returns The property's source line(s), indented for `level`.
 * @throws {Error} Never thrown directly; unknown kinds fall back to `unknown`.
 */
const emitProperty = (field: EmitField, level: number): string => {
    const p = pad(level);
    const name = field.name ?? '';
    const req = Boolean(field.required);
    const opt = req ? '' : '?';

    switch (field.type) {
        case 'text':
        case 'textarea':
        case 'email':
        case 'code': {
            const base = field.hasMany ? 'string[]' : 'string';
            return req ? `${p}${name}: ${base};` : `${p}${name}?: ${base} | null;`;
        }
        case 'number': {
            const base = field.hasMany ? 'number[]' : 'number';
            return req ? `${p}${name}: ${base};` : `${p}${name}?: ${base} | null;`;
        }
        case 'date':
            return req ? `${p}${name}: string;` : `${p}${name}?: string | null;`;
        case 'checkbox':
            return req ? `${p}${name}: boolean;` : `${p}${name}?: boolean | null;`;
        case 'select': {
            const union = selectUnion(field.options);
            if (field.hasMany) {
                return req ? `${p}${name}: (${union})[];` : `${p}${name}?: (${union})[] | null;`;
            }
            return req ? `${p}${name}: ${union};` : `${p}${name}?: (${union}) | null;`;
        }
        case 'json':
            return req ? `${p}${name}: ${JSON_TYPE};` : `${p}${name}?: ${JSON_TYPE};`;
        case 'richText':
            return req ? `${p}${name}: ${RICHTEXT_TYPE};` : `${p}${name}?: ${RICHTEXT_TYPE};`;
        case 'relationship':
        case 'upload': {
            const target = RELATION_INTERFACE[field.relationTo ?? ''] ?? 'string';
            if (field.hasMany) {
                return req
                    ? `${p}${name}: (string | ${target})[];`
                    : `${p}${name}?: (string | ${target})[] | null;`;
            }
            return req ? `${p}${name}: string | ${target};` : `${p}${name}?: (string | null) | ${target};`;
        }
        case 'group': {
            const groupReq = (field.fields ?? []).some(forcesParentRequired);
            const body = emitFields(field.fields ?? [], level + 1);
            return `${p}${name}${groupReq ? '' : '?'}: {\n${body}\n${p}};`;
        }
        case 'array': {
            const rowFields = emitFields(field.fields ?? [], level + 1);
            const idLine = `${pad(level + 1)}id?: string | null;`;
            const row = `Array<{\n${rowFields}\n${idLine}\n${p}}>`;
            return req ? `${p}${name}: ${row};` : `${p}${name}?: ${row} | null;`;
        }
        case 'blocks': {
            const union = (field.blocks ?? [])
                .map((b) => b.interfaceName ?? b.slug)
                .join(' | ');
            return req ? `${p}${name}: Array<${union}>;` : `${p}${name}?: Array<${union}> | null;`;
        }
        default:
            return `${p}${name}${opt}: unknown;`;
    }
};

/**
 * Emits the content interface for a single block definition: its descriptor
 * fields followed by Payload's per-block `id` / `blockName` / `blockType`
 * discriminator triplet.
 *
 * @param block - The block definition to emit.
 * @returns The full `export interface` source for the block.
 */
const emitBlockInterface = (block: EmitBlock): string => {
    const name = block.interfaceName ?? block.slug;
    const fields = emitFields(block.fields, 1);
    const tail = `${INDENT}id?: string | null;\n${INDENT}blockName?: string | null;\n${INDENT}blockType: '${block.slug}';`;
    return `export interface ${name} {\n${fields}\n${tail}\n}`;
};

/**
 * Per-collection injection spec for the non-descriptor fields Payload's plugins
 * add to a document (id, tenant, timestamps, draft status, auth, upload). The
 * descriptor field walk supplies everything between {@link DocInjection.leading}
 * and the trailing blocks.
 */
type DocInjection = {
    /** Lines injected immediately after `id: string;` (e.g. the multi-tenant `tenant` ref). */
    leading: string[];
    /** Lines injected after the descriptor fields but before the timestamps (the users `tenants` array). */
    beforeTimestamps: string[];
    /** Lines injected after the timestamps (auth fields, upload fields). */
    afterTimestamps: string[];
    /** Whether the collection has draft versions, adding a trailing `_status`. */
    status: boolean;
};

const TENANT_LINE = `${INDENT}tenant?: (string | null) | Shop;`;

const USERS_TENANTS = `${INDENT}tenants?: Array<{ tenant: string | Shop; id?: string | null }> | null;`;

const USERS_AUTH = [
    `${INDENT}email: string;`,
    `${INDENT}resetPasswordToken?: string | null;`,
    `${INDENT}resetPasswordExpiration?: string | null;`,
    `${INDENT}salt?: string | null;`,
    `${INDENT}hash?: string | null;`,
    `${INDENT}loginAttempts?: number | null;`,
    `${INDENT}lockUntil?: string | null;`,
    `${INDENT}sessions?: Array<{ id: string; createdAt?: string | null; expiresAt: string }> | null;`,
    `${INDENT}password?: string | null;`,
    `${INDENT}collection: 'users';`,
];

const MEDIA_SIZE = '{ url?: string | null; width?: number | null; height?: number | null; mimeType?: string | null; filesize?: number | null; filename?: string | null }';

const MEDIA_UPLOAD = [
    `${INDENT}url?: string | null;`,
    `${INDENT}thumbnailURL?: string | null;`,
    `${INDENT}filename?: string | null;`,
    `${INDENT}mimeType?: string | null;`,
    `${INDENT}filesize?: number | null;`,
    `${INDENT}width?: number | null;`,
    `${INDENT}height?: number | null;`,
    `${INDENT}focalX?: number | null;`,
    `${INDENT}focalY?: number | null;`,
    `${INDENT}sizes?: { thumbnail?: ${MEDIA_SIZE}; card?: ${MEDIA_SIZE}; feature?: ${MEDIA_SIZE}; hero?: ${MEDIA_SIZE} };`,
];

/**
 * The framework-field injection spec per collection slug. Encoded explicitly
 * (rather than inferred) because the set of CMS collections is fixed and the
 * Payload plugin contributions (multi-tenant, versions, auth, upload) are
 * framework concerns the descriptors omit; pinning them keeps the generated
 * documents structurally equal to the frozen read contract.
 */
const DOC_INJECTIONS: Record<string, DocInjection> = {
    users: { leading: [], beforeTimestamps: [USERS_TENANTS], afterTimestamps: USERS_AUTH, status: false },
    shops: { leading: [], beforeTimestamps: [], afterTimestamps: [], status: false },
    'feature-flags': { leading: [], beforeTimestamps: [], afterTimestamps: [], status: false },
    media: { leading: [TENANT_LINE], beforeTimestamps: [], afterTimestamps: MEDIA_UPLOAD, status: false },
    pages: { leading: [TENANT_LINE], beforeTimestamps: [], afterTimestamps: [], status: true },
    articles: { leading: [TENANT_LINE], beforeTimestamps: [], afterTimestamps: [], status: true },
    productMetadata: { leading: [TENANT_LINE], beforeTimestamps: [], afterTimestamps: [], status: true },
    collectionMetadata: { leading: [TENANT_LINE], beforeTimestamps: [], afterTimestamps: [], status: true },
    reviews: { leading: [TENANT_LINE], beforeTimestamps: [], afterTimestamps: [], status: false },
    header: { leading: [TENANT_LINE], beforeTimestamps: [], afterTimestamps: [], status: true },
    footer: { leading: [TENANT_LINE], beforeTimestamps: [], afterTimestamps: [], status: true },
    businessData: { leading: [TENANT_LINE], beforeTimestamps: [], afterTimestamps: [], status: true },
};

/**
 * Emits the document content interface for one collection: the framework `id`,
 * the injected leading fields, the descriptor-derived fields, the injected
 * pre-timestamp fields, `updatedAt` / `createdAt`, the injected post-timestamp
 * fields, and a trailing `_status` for versioned collections.
 *
 * @param slug - The collection slug.
 * @param fields - The collection's descriptor/runtime field configs.
 * @returns The full `export interface` source for the document.
 * @throws {UnknownCollectionSlugError} When the collection slug has no registered interface name or injection spec.
 */
const emitDocInterface = (slug: string, fields: EmitField[]): string => {
    const name = RELATION_INTERFACE[slug];
    const injection = DOC_INJECTIONS[slug];
    if (!name || !injection) {
        throw new UnknownCollectionSlugError(slug, 'cms codegen: no interface/injection mapping for collection');
    }
    const parts: string[] = [`${INDENT}id: string;`, ...injection.leading];
    const body = emitFields(fields, 1);
    if (body) parts.push(body);
    parts.push(...injection.beforeTimestamps);
    parts.push(`${INDENT}updatedAt: string;`, `${INDENT}createdAt: string;`);
    parts.push(...injection.afterTimestamps);
    if (injection.status) parts.push(`${INDENT}_status?: ('draft' | 'published') | null;`);
    return `export interface ${name} {\n${parts.join('\n')}\n}`;
};

const HEADER = `/* tslint:disable */
/* eslint-disable */
/**
 * This file was automatically generated from the CMS field descriptors by
 * \`pnpm cms:gen\` (packages/cms/scripts/cms-gen.ts). DO NOT EDIT BY
 * HAND — changes are overwritten on the next run, and CI's \`cms:gen:check\`
 * drift gate fails on any uncommitted divergence. Edit the descriptors under
 * src/collections, src/blocks, and src/fields instead, then regenerate.
 */`;

/**
 * Renders the complete `payload-types.ts` source: the header, the Payload
 * framework preamble, the descriptor-derived document + block interfaces, the
 * Payload framework tail, and the `GeneratedTypes` module augmentation.
 *
 * @returns The full file contents, newline-terminated.
 */
export const generatePayloadTypes = (): string => {
    const collections = allCollections as unknown as Array<{ slug: string; fields: EmitField[] }>;
    const blocks = allBlocks as unknown as EmitBlock[];

    const docInterfaces = collections.map((c) => emitDocInterface(c.slug, c.fields));
    const blockInterfaces = blocks.map(emitBlockInterface);

    const generatedTypes = `declare module 'payload' {
  export interface GeneratedTypes extends Config {}
}`;

    return `${HEADER}
${SCAFFOLD_PREAMBLE.trimEnd()}

${docInterfaces.join('\n')}
${blockInterfaces.join('\n')}

${SCAFFOLD_TAIL.trimEnd()}

${generatedTypes}
`;
};
