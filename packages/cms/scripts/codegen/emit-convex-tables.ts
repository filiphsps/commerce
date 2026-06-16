/**
 * Descriptor-driven generator for the Convex CMS content-table validators.
 *
 * Walks the frozen descriptor field shapes (`allCollectionShapes` in
 * `content-shapes.ts`) and emits a `packages/convex/convex/tables/cms.ts`
 * module: one `defineTable(v.object({…}))` per CMS-owned content collection,
 * exported as a `Record<string, TableDefinition>` for the schema's reserved
 * `cmsTables` slot (see `convex/tables/index.ts`).
 *
 * No Payload runtime, no Mongo — pure data. The content fields come straight
 * from the descriptors; the tenant `shop` foreign key and `createdAt`/`updatedAt`
 * timestamps are framework injections (mirroring the existing `reviews` table
 * and the content-types tenant/timestamp injections), so every tenant-scoped
 * table carries the `by_shop` index the multi-tenant schema convention requires.
 * `shop` stays a forward-referenced `v.string()` until the `shops` table lands,
 * exactly as `tables/reviews.ts` documents.
 */
import { UnknownCollectionSlugError } from '@nordcom/commerce-errors';
import { allCollectionShapes } from './content-shapes';

/** Structural view of a Payload/descriptor field as walked by the emitter. */
type EmitField = {
    type: string;
    name?: string;
    required?: boolean;
    hasMany?: boolean;
    options?: Array<{ value: string } | string>;
    fields?: EmitField[];
};

/**
 * CMS-owned content collections that become Convex content tables, in emission
 * order. Platform-global collections (`shops`, `users`, `feature-flags`,
 * `reviews`) are NOT here — they belong to the core slot and their own waves.
 */
const CMS_CONTENT_COLLECTIONS = [
    'pages',
    'articles',
    'productMetadata',
    'collectionMetadata',
    'media',
    'header',
    'footer',
    'search',
] as const;

/**
 * Builds a Convex validator expression for a select field's options.
 *
 * @param options - The field's options.
 * @returns A `v.literal(...)` for a single option or `v.union(...)` for several.
 */
const selectValidator = (options: EmitField['options']): string => {
    const values = (options ?? []).map((opt) => (typeof opt === 'string' ? opt : opt.value));
    if (values.length === 0) return 'v.string()';
    if (values.length === 1) return `v.literal('${values[0]}')`;
    return `v.union(${values.map((value) => `v.literal('${value}')`).join(', ')})`;
};

/**
 * Maps a single descriptor/runtime field to its Convex validator expression,
 * recursing through groups and arrays. Presentational `collapsible` containers
 * are handled by the caller (flattened), never reaching here.
 *
 * @param field - The field to map.
 * @param indent - Indentation prefix for nested object members.
 * @returns The validator source expression (without a trailing comma).
 */
const fieldValidator = (field: EmitField, indent: string): string => {
    const base = (): string => {
        switch (field.type) {
            case 'text':
            case 'textarea':
            case 'email':
            case 'code':
            case 'date':
            case 'relationship':
            case 'upload':
                return field.hasMany ? 'v.array(v.string())' : 'v.string()';
            case 'number':
                return field.hasMany ? 'v.array(v.number())' : 'v.number()';
            case 'checkbox':
                return 'v.boolean()';
            case 'select': {
                const union = selectValidator(field.options);
                return field.hasMany ? `v.array(${union})` : union;
            }
            case 'json':
            case 'richText':
                // Lexical/JSON blobs are stored opaquely; richer validators are a
                // later CMSRICH-01 concern.
                return 'v.any()';
            case 'blocks':
                // Polymorphic block rows are stored opaquely here; structured
                // per-block validators are a later CMSRICH-01 concern.
                return 'v.array(v.any())';
            case 'group':
                return objectValidator(field.fields ?? [], indent);
            case 'array':
                return `v.array(${objectValidator(field.fields ?? [], indent)})`;
            default:
                return 'v.any()';
        }
    };
    const expr = base();
    return field.required ? expr : `v.optional(${expr})`;
};

/**
 * Builds a `v.object({...})` validator from a list of named fields, flattening
 * presentational `collapsible` containers into the same object.
 *
 * @param fields - The fields to include.
 * @param indent - Indentation prefix for the object's members.
 * @returns The `v.object({...})` source expression.
 */
const objectValidator = (fields: EmitField[], indent: string): string => {
    const inner = `${indent}    `;
    const members: string[] = [];
    for (const field of fields) {
        if (field.type === 'collapsible') {
            for (const child of field.fields ?? []) {
                members.push(`${inner}${child.name}: ${fieldValidator(child, inner)},`);
            }
            continue;
        }
        members.push(`${inner}${field.name}: ${fieldValidator(field, inner)},`);
    }
    if (members.length === 0) return 'v.object({})';
    return `v.object({\n${members.join('\n')}\n${indent}})`;
};

/**
 * Emits one `defineTable(...)` entry for a CMS content collection: the injected
 * tenant `shop` ref, the descriptor-derived content fields, and the injected
 * timestamps, indexed `by_shop`.
 *
 * @param slug - The collection slug (also the table key).
 * @param fields - The collection's descriptor/runtime field configs.
 * @returns The `slug: defineTable(...)` source entry.
 */
const emitTable = (slug: string, fields: EmitField[]): string => {
    const indent = '            ';
    const members: string[] = [`${indent}shop: v.string(),`];
    for (const field of fields) {
        if (field.type === 'collapsible') {
            for (const child of field.fields ?? []) {
                members.push(`${indent}${child.name}: ${fieldValidator(child, indent)},`);
            }
            continue;
        }
        members.push(`${indent}${field.name}: ${fieldValidator(field, indent)},`);
    }
    members.push(`${indent}createdAt: v.number(),`, `${indent}updatedAt: v.number(),`);
    return `    ${slug}: defineTable(\n        v.object({\n${members.join('\n')}\n        })\n    ).index('by_shop', ['shop']),`;
};

const HEADER = `/**
 * AUTO-GENERATED from the CMS field descriptors by \`pnpm cms:gen\`
 * (packages/cms/scripts/cms-gen.ts). DO NOT EDIT BY HAND — changes are
 * overwritten on the next run, and CI's \`cms:gen:check\` drift gate fails on any
 * uncommitted divergence. Edit the descriptors under packages/cms/src and
 * regenerate.
 *
 * CMS-owned content tables for the reserved \`cmsTables\` schema slot (see
 * \`tables/index.ts\`). Each table carries the tenant \`shop\` foreign key first and
 * a \`by_shop\` index per the multi-tenant schema convention; \`shop\` is a
 * forward-referenced \`v.string()\` until the \`shops\` table lands (see
 * \`tables/reviews.ts\`). Content fields are descriptor-derived; rich \`blocks\` /
 * rich-text bodies are stored opaquely (\`v.any()\`) pending CMSRICH-01.
 */`;

/**
 * Renders the complete `convex/tables/cms.ts` source from the CMS content
 * collections' descriptor fields.
 *
 * @returns The full file contents, newline-terminated.
 * @throws {UnknownCollectionSlugError} When a configured CMS content collection is missing from `allCollectionShapes`.
 */
export const generateConvexCmsTables = (): string => {
    const collections = allCollectionShapes as unknown as Array<{ slug: string; fields: EmitField[] }>;
    const bySlug = new Map(collections.map((c) => [c.slug, c.fields]));

    const tables = CMS_CONTENT_COLLECTIONS.map((slug) => {
        const fields = bySlug.get(slug);
        if (!fields) {
            throw new UnknownCollectionSlugError(
                slug,
                'cms codegen: CMS content collection not found in allCollectionShapes',
            );
        }
        return emitTable(slug, fields);
    });

    return `${HEADER}
import { defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * The CMS-owned content table group. Spread into \`cmsTables\` via \`tables/index.ts\`,
 * then into \`defineSchema\`.
 */
export const cmsContentTables = {
${tables.join('\n')}
};
`;
};
