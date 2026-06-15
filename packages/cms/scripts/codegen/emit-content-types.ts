/**
 * Descriptor-driven generator for `src/types/content-types.ts`.
 *
 * Walks the frozen descriptor field shapes (`allCollectionShapes` /
 * `allBlockShapes` in `content-shapes.ts`) — plain data, no CMS runtime — and
 * emits the document and block content interfaces the storefront read surface
 * consumes (the SFREAD-01 contract types: `Header`, `Footer`, `Page`,
 * `Article`, `Media`, the metadata overlays, …).
 *
 * TEARDOWN-02 retired the Payload half of this artifact: the framework
 * scaffold (`Config`, the `*Select<T>` helpers, the `payload-*` internal
 * collections, the `GeneratedTypes` module augmentation) is gone with the
 * Payload runtime, and the generated file moved from `payload-types.ts` to
 * `content-types.ts`. The document/block interfaces themselves are emitted
 * unchanged — the storefront read contract is frozen against these shapes, so
 * the framework-field injections below (tenant ref, timestamps, draft
 * `_status`, the media upload members) stay exactly as the Payload era
 * persisted them.
 *
 * Formatting is the emitter's own — the file is git-tracked and Biome-ignored,
 * and the drift gate diffs this emitter's output against the committed file.
 * What MUST hold is structural type equality on the consumed interfaces, which
 * every consumer's typecheck gates.
 */
import { UnknownCollectionSlugError } from '@nordcom/commerce-errors';
import { BREAKPOINTS } from '../../src/responsive/breakpoints';
import { allBlockShapes, allCollectionShapes } from './content-shapes';

/** Structural view of a descriptor field as walked by the emitter. */
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
    /** The wrapped scalar field for a `responsive` descriptor. */
    field?: EmitField;
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

/**
 * The bare TypeScript value type for a scalar field — the inner type a
 * `responsive` descriptor repeats per breakpoint (no name, no optionality).
 *
 * @param field - The wrapped scalar field.
 * @returns The value type expression (e.g. `('grid' | 'carousel')`, `number`).
 */
const scalarValueType = (field: EmitField): string => {
    switch (field.type) {
        case 'select':
            return `(${selectUnion(field.options)})`;
        case 'number':
            return 'number';
        case 'checkbox':
            return 'boolean';
        default:
            return 'string';
    }
};

/**
 * Emits the `{ base: T; sm?: T | null; … }` breakpoint-map type for a responsive
 * field, keyed by the shared {@link BREAKPOINTS} scale. `base` is required; every
 * other breakpoint is optional and nullable.
 *
 * @param inner - The per-breakpoint value type.
 * @returns The object type literal.
 */
const responsiveObjectType = (inner: string): string => {
    const props = BREAKPOINTS.map((breakpoint) => {
        const key = /^[a-z]/.test(breakpoint) ? breakpoint : `'${breakpoint}'`;
        return breakpoint === 'base' ? `base: ${inner}` : `${key}?: ${inner} | null`;
    });
    return `{ ${props.join('; ')} }`;
};

/** Loose-JSON value union Payload emits for `json` fields. */
const JSON_TYPE = '{ [k: string]: unknown } | unknown[] | string | number | boolean | null';

/** Lexical rich-text document shape Payload emits for `richText` fields. */
const RICHTEXT_TYPE =
    '{ root: { type: string; children: { type: any; version: number; [k: string]: unknown }[]; ' +
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
                return req ? `${p}${name}: (string | ${target})[];` : `${p}${name}?: (string | ${target})[] | null;`;
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
            const union = (field.blocks ?? []).map((b) => b.interfaceName ?? b.slug).join(' | ');
            return req ? `${p}${name}: Array<${union}>;` : `${p}${name}?: Array<${union}> | null;`;
        }
        case 'responsive': {
            const obj = responsiveObjectType(scalarValueType(field.field ?? { type: 'text' }));
            return req ? `${p}${name}: ${obj};` : `${p}${name}?: ${obj} | null;`;
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

const MEDIA_SIZE =
    '{ url?: string | null; width?: number | null; height?: number | null; mimeType?: string | null; filesize?: number | null; filename?: string | null }';

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

const HEADER = `/**
 * This file was automatically generated from the CMS field descriptors by
 * \`pnpm cms:gen\` (packages/cms/scripts/cms-gen.ts). DO NOT EDIT BY
 * HAND — changes are overwritten on the next run, and CI's \`cms:gen:check\`
 * drift gate fails on any uncommitted divergence. Edit the field shapes in
 * scripts/codegen/content-shapes.ts (and the descriptors under src/fields /
 * src/descriptors) instead, then regenerate.
 */`;

/**
 * Renders the complete `content-types.ts` source: the header plus the
 * descriptor-derived document and block interfaces.
 *
 * @returns The full file contents, newline-terminated.
 */
export const generateContentTypes = (): string => {
    const collections = allCollectionShapes as unknown as Array<{ slug: string; fields: EmitField[] }>;
    const blocks = allBlockShapes as unknown as EmitBlock[];

    const docInterfaces = collections.map((c) => emitDocInterface(c.slug, c.fields));
    const blockInterfaces = blocks.map(emitBlockInterface);

    return `${HEADER}

${docInterfaces.join('\n')}
${blockInterfaces.join('\n')}
`;
};
