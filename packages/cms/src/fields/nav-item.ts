import type { Field } from 'payload';
import { linkField } from './link';

export type NavItemFieldOptions = {
    depth: number;
};

const buildNavItems = (remaining: number): Extract<Field, { type: 'array' }> => ({
    name: 'items',
    type: 'array',
    fields: [
        linkField({ name: 'link', localized: true }),
        ...(remaining > 1 ? [buildNavItems(remaining - 1) as Field] : []),
    ],
});

export const navItemField = ({ depth }: NavItemFieldOptions) => buildNavItems(depth);
