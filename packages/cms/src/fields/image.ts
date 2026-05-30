import type { UploadFieldDescriptor } from '../descriptors';
import { uploadField } from '../descriptors';

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
 * Builds an upload field descriptor that points at the `media` collection.
 *
 * @param options - {@link ImageFieldOptions} controlling the field name, label, and validation.
 * @returns An upload field descriptor pinned to the `media` collection.
 *
 * @example
 * imageField({ name: 'thumbnail', required: true });
 */
export const imageField = ({
    name,
    label,
    required = false,
    localized = false,
}: ImageFieldOptions): UploadFieldDescriptor<'media'> =>
    uploadField({
        name,
        relationTo: 'media',
        label,
        required,
        localized,
    });
