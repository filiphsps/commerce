import type { Field } from 'payload';
import { imageField } from './image';
import { linkField } from './link';

/**
 * All supported mega-menu layout variants. Drives the `variant` select on
 * top-level nav items built by {@link topLevelNavItemField}.
 *
 * @example
 * HEADER_VARIANTS.includes('editorial-columns'); // true
 */
export const HEADER_VARIANTS = ['editorial-columns', 'compact-list', 'featured-promo'] as const;

/**
 * Union of supported mega-menu layout variant identifiers derived from
 * {@link HEADER_VARIANTS}.
 *
 * @example
 * const v: HeaderVariant = 'editorial-columns';
 */
export type HeaderVariant = (typeof HEADER_VARIANTS)[number];

/**
 * Options controlling the nesting depth of nav-item fields.
 *
 * @example
 * navItemField({ depth: 2 }); // two levels of nested items
 */
export type NavItemFieldOptions = {
    depth: number;
};

/**
 * Builds the recursive `items` array field for nav-item nesting. Used by
 * {@link navItemField} and as the child-level builder inside
 * {@link topLevelNavItemField}. Recurses until `remaining` reaches 1.
 *
 * @param remaining - Levels of nesting still to produce.
 * @returns A Payload `array` field config with link, image, description, and optional child `items`.
 */
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

/**
 * Builds a flat nav-item `items` array field for non-header menus (footer,
 * etc.) that do not need a top-level variant picker.
 *
 * @param options - {@link NavItemFieldOptions} controlling nesting depth.
 * @returns A Payload `array` field config produced by {@link buildChildItems}.
 *
 * @example
 * navItemField({ depth: 2 });
 */
export const navItemField = ({ depth }: NavItemFieldOptions) => buildChildItems(depth);

/**
 * Builds the top-level nav-item `items` array for header menus. Adds a
 * `variant` select (sourced from {@link HEADER_VARIANTS}) so editors can
 * choose the mega-menu layout per item. Child items recurse via
 * {@link buildChildItems}.
 *
 * @param options - {@link NavItemFieldOptions} controlling nesting depth.
 * @returns A Payload `array` field config with a variant select at the root level.
 *
 * @example
 * topLevelNavItemField({ depth: 2 });
 */
export const topLevelNavItemField = ({ depth }: NavItemFieldOptions): Extract<Field, { type: 'array' }> => ({
    name: 'items',
    type: 'array',
    fields: [
        linkField({ name: 'link', localized: true }),
        {
            name: 'variant',
            type: 'select',
            defaultValue: 'editorial-columns' satisfies HeaderVariant,
            options: HEADER_VARIANTS.map((value) => ({
                label: value
                    .split('-')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' '),
                value,
            })),
        },
        imageField({ name: 'image', localized: true }),
        { name: 'description', type: 'textarea', localized: true },
        { name: 'backgroundColor', type: 'text' },
        ...(depth > 1 ? [buildChildItems(depth - 1) as Field] : []),
    ],
});
