import type { ApiError } from '@/utils/errors';
import {
    IconHeightNoFractionalError,
    IconHeightOutOfBoundsError,
    IconWidthNoFractionalError,
    IconWidthOutOfBoundsError
} from '@/utils/errors';

/**
 * Validate invalid width/height, most likely by a malicious actor.
 * @param {object} size - The size object to validate.
 * @param {number} [size.width] - The width of the icon.
 * @param {number} [size.height] - The height of the icon.
 * @returns {ApiError[]} - An array of errors.
 */
export const validateSize = ({ width, height }: { width?: number | null; height?: number | null }): ApiError[] => {
    let errors: ApiError[] = [];

    if (width) {
        if (!Number.isInteger(width)) {
            errors.push(new IconWidthNoFractionalError());
        }
        if (width <= 0 || width > 1024) {
            errors.push(new IconWidthOutOfBoundsError());
        }
    }

    if (height) {
        if (!Number.isInteger(height)) {
            errors.push(new IconHeightNoFractionalError());
        }

        if (height <= 0 || height > 1024) {
            errors.push(new IconHeightOutOfBoundsError());
        }
    }

    return errors;
};
