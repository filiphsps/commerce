import type { Field } from 'payload';

export type ImageFieldOptions = {
    name: string;
    label?: string;
    required?: boolean;
    localized?: boolean;
};

export const imageField = ({
    name,
    label,
    required = false,
    localized = false,
}: ImageFieldOptions): Extract<Field, { type: 'upload' }> => ({
    name,
    type: 'upload',
    relationTo: 'media',
    label,
    required,
    localized,
});
