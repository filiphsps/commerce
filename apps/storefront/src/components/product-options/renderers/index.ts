import Chip from '../primitives/chip';
import Swatch from '../primitives/swatch';
import type { OptionValueRenderer, ResolvedOption, ResolvedOptionValue } from '../types';

const SIZE_NAME_RE = /^(size|größe|storlek|talla|taille)$/i;
const SIZE_VALUE_RE = /^(XS|S|M|L|XL|XXL|\d{2,3}|\d+(\.\d)?)$/;

export function pickBuiltin(group: ResolvedOption, value: ResolvedOptionValue): OptionValueRenderer {
    if (value.swatch?.color) return Swatch;
    if (value.swatch?.image?.url) return Swatch;
    if (SIZE_NAME_RE.test(group.name) || SIZE_VALUE_RE.test(value.name)) return Chip;
    return Chip;
}
