import Chip from '../primitives/chip';
import Swatch from '../primitives/swatch';
import type { OptionValueRenderer, ResolvedOption, ResolvedOptionValue } from '../types';

const SIZE_NAME_RE = /^(size|größe|storlek|talla|taille)$/i;
const SIZE_VALUE_RE = /^(XS|S|M|L|XL|XXL|\d{2,3}|\d+(\.\d)?)$/;

/**
 * Returns the built-in renderer best suited for the given option group and value.
 *
 * @param group - Resolved option group used to check the group name against size patterns.
 * @param value - Resolved option value used to check for a swatch color or image.
 * @returns `Swatch` when the value has a swatch, otherwise `Chip`.
 */
export function pickBuiltin(group: ResolvedOption, value: ResolvedOptionValue): OptionValueRenderer {
    if (value.swatch?.color) return Swatch;
    if (value.swatch?.image?.url) return Swatch;
    if (SIZE_NAME_RE.test(group.name) || SIZE_VALUE_RE.test(value.name)) return Chip;
    return Chip;
}
