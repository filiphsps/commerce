import type { Field } from 'payload';
import { imageField } from './image';
import { linkField } from './link';

export type NavItemFieldOptions = {
    depth: number;
};

// Recursive child-shape builder used by both the legacy `navItemField`
// export (back-compat for non-header callers like the footer) and by
// `topLevelNavItemField`'s nested `items` array.
const buildChildItems = (remaining: number): Extract<Field, { type: 'array' }> => ({
    name: 'items',
    type: 'array',
    fields: [
        linkField({ name: 'link', localized: true }),
        imageField({ name: 'image', localized: true }),
        { name: 'description', type: 'textarea', localized: true },
        { name: 'backgroundColor', type: 'text' },
        ...(remaining > 1 ? [buildChildItems(remaining - 1) as Field] : []),
    ],
});

// Legacy export: same shape this file has always produced. Used by any
// menu collection (footer, etc) that does NOT need a top-level variant
// picker. The header switches to `topLevelNavItemField` below.
export const navItemField = ({ depth }: NavItemFieldOptions) => buildChildItems(depth);

// Top-level menu items (header root): adds a `variant` select so the
// CMS editor can choose which mega-menu layout to render. Children
// recurse via the unchanged child-shape builder above.
export const topLevelNavItemField = ({ depth }: NavItemFieldOptions): Extract<Field, { type: 'array' }> => ({
    name: 'items',
    type: 'array',
    fields: [
        linkField({ name: 'link', localized: true }),
        {
            name: 'variant',
            type: 'select',
            defaultValue: 'editorial-columns',
            options: [
                { label: 'Editorial Columns', value: 'editorial-columns' },
                { label: 'Compact List', value: 'compact-list' },
                { label: 'Featured Promo', value: 'featured-promo' },
            ],
        },
        imageField({ name: 'image', localized: true }),
        { name: 'description', type: 'textarea', localized: true },
        { name: 'backgroundColor', type: 'text' },
        ...(depth > 1 ? [buildChildItems(depth - 1) as Field] : []),
    ],
});
