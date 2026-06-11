import { describe, expect, it } from 'vitest';
import { allCollections } from './index';

/**
 * Minimal structural view of a field node used while walking collection configs
 * for localization. Covers only the keys the walk inspects — the descriptor and
 * Payload field shapes both satisfy it structurally.
 */
type WalkableField = {
    type?: string;
    name?: string;
    localized?: boolean;
    fields?: WalkableField[];
};

/**
 * Recursively collects the dotted paths of every `localized: true` field within
 * a field array. Descends into the nested `fields` of groups, arrays, and
 * collapsibles (an unnamed collapsible contributes no path segment) but
 * deliberately does NOT descend into a `blocks` field's variants: those
 * localized sub-fields are owned by the blocks module, not the collection
 * configs this task re-expresses, and counting them would double-count the
 * shared block set across every collection that embeds `allBlocks`.
 *
 * @param fields - The field nodes to walk.
 * @param prefix - Dotted path accumulated from ancestor named fields.
 * @returns The localized field paths discovered under `fields`, in source order.
 */
const collectLocalizedPaths = (fields: WalkableField[], prefix: string): string[] => {
    const paths: string[] = [];
    for (const field of fields) {
        const name = typeof field.name === 'string' ? field.name : undefined;
        const path = name ? (prefix ? `${prefix}.${name}` : name) : prefix;
        if (field.localized === true && name) paths.push(path);
        if (Array.isArray(field.fields)) paths.push(...collectLocalizedPaths(field.fields, name ? path : prefix));
    }
    return paths;
};

describe('localized field set', () => {
    const localizedPaths = allCollections
        .flatMap((collection) =>
            collectLocalizedPaths((collection.fields ?? []) as unknown as WalkableField[], collection.slug ?? ''),
        )
        .sort();

    // This set is the localization contract. Any field that gains or loses
    // `localized` — in a collection, a shared field builder
    // (seo/link/nav-item/image), or the nav-menu recursion depth — moves this
    // snapshot and fails the test, surfacing an unintended localization change
    // for review. G4FIX-03 consciously moved it once: composite (group)
    // localization was silently locale-shared by the native editor and the
    // corpus held no per-locale group data, so the seo/link groups were
    // re-declared with leaf-level localization on their text members and the
    // descriptor system now rejects `localized: true` on composite kinds.
    it('matches the frozen 43-field set across all collections', () => {
        expect(localizedPaths).toMatchInlineSnapshot(`
          [
            "articles.body",
            "articles.excerpt",
            "articles.seo.description",
            "articles.seo.keywords",
            "articles.seo.title",
            "articles.title",
            "collectionMetadata.descriptionOverride",
            "collectionMetadata.seo.description",
            "collectionMetadata.seo.keywords",
            "collectionMetadata.seo.title",
            "footer.copyrightLine",
            "footer.legal.link.label",
            "footer.sections.links.link.label",
            "footer.sections.title",
            "header.cta.label",
            "header.items.description",
            "header.items.image",
            "header.items.items.description",
            "header.items.items.image",
            "header.items.items.items.description",
            "header.items.items.items.image",
            "header.items.items.items.items.description",
            "header.items.items.items.items.image",
            "header.items.items.items.items.items.description",
            "header.items.items.items.items.items.image",
            "header.items.items.items.items.items.items.description",
            "header.items.items.items.items.items.items.image",
            "header.items.items.items.items.items.items.link.label",
            "header.items.items.items.items.items.link.label",
            "header.items.items.items.items.link.label",
            "header.items.items.items.link.label",
            "header.items.items.link.label",
            "header.items.link.label",
            "header.localeSwitcher.label",
            "media.caption",
            "pages.seo.description",
            "pages.seo.keywords",
            "pages.seo.title",
            "pages.title",
            "productMetadata.descriptionOverride",
            "productMetadata.seo.description",
            "productMetadata.seo.keywords",
            "productMetadata.seo.title",
          ]
        `);
    });

    it('contains exactly 43 localized fields', () => {
        expect(localizedPaths).toHaveLength(43);
    });
});
