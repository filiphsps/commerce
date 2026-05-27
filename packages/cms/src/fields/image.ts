import type { Field } from 'payload';

/**
 * Configuration options for {@link imageField}.
 *
 * @example
 * imageField({ name: 'heroImage', label: 'Hero image', required: true });
 */
export type ImageFieldOptions = {
    name: string;
    label?: string;
    required?: boolean;
    localized?: boolean;
};

/**
 * Builds a Payload `upload` field that points at the `media` collection.
 *
 * @param options - {@link ImageFieldOptions} controlling the field name, label, and validation.
 * @returns A typed Payload upload field config.
 *
 * @example
 * imageField({ name: 'thumbnail', required: true });
 */
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
