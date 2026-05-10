import type { ApiError } from '@nordcom/commerce-errors';
import { ImageNoFractionalError, ImageOutOfBoundsError } from '@nordcom/commerce-errors';

/**
 * Validate invalid width/height, most likely by a malicious actor.
 * @param size - The size object to validate.
 * @param [size.width] - The width of the icon.
 * @param [size.height] - The height of the icon.
 * @returns - An array of errors.
 */
export const validateSize = ({ width, height }: { width?: number | null; height?: number | null }): ApiError[] => {
    const errors: ApiError[] = [];

    if (width) {
        if (!Number.isInteger(width)) {
            errors.push(new ImageNoFractionalError());
        }
        if (width <= 0 || width > 1024) {
            errors.push(new ImageOutOfBoundsError());
        }
    }

    if (height) {
        if (!Number.isInteger(height)) {
            errors.push(new ImageNoFractionalError());
        }

        if (height <= 0 || height > 1024) {
            errors.push(new ImageOutOfBoundsError());
        }
    }

    return errors;
};
