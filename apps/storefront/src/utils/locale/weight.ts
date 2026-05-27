import { TodoError } from '@nordcom/commerce-errors';
import type { WeightUnit } from '@shopify/hydrogen-react/storefront-api-types';
import type { Unit } from 'convert-units';
import ConvertUnits from 'convert-units';
import type { Locale } from './locale';

/**
 * Determines whether a locale uses imperial weight measurements (pounds/ounces) rather than metric.
 *
 * @param locale - The active locale; only `locale.country` is inspected.
 * @returns `true` for US, Liberia, and Myanmar locales; also `true` when `locale.country` is absent (safe default for unknown countries).
 */
export function usesImperialUnits(locale: Locale): boolean {
    return locale.country
        ? ['us', 'lr', 'mm'].includes(locale.country.toLowerCase()) // United States, Liberia, Myanmar. The rest are metric.
        : true;
}

/**
 * Maps a Shopify `WeightUnit` enum value to the equivalent `convert-units` unit symbol.
 *
 * @param unit - Shopify weight unit string (e.g., `'GRAMS'`, `'KILOGRAMS'`).
 * @returns The `convert-units` unit symbol (`'g'`, `'kg'`, `'oz'`, `'lb'`).
 * @throws {TodoError} When `unit` is not one of the four recognized Shopify weight units.
 */
export function weightUnitToUnit(unit: WeightUnit): Unit {
    switch (unit.toLowerCase()) {
        case 'grams':
            return 'g';
        case 'kilograms':
            return 'kg';
        case 'ounces':
            return 'oz';
        case 'pounds':
            return 'lb';
        default: {
            throw new TodoError(`Unknown weight unit: ${unit}`);
        }
    }
}
/**
 * Maps a `convert-units` unit symbol back to the Shopify `WeightUnit` enum value.
 *
 * @param unit - A `convert-units` weight symbol (`'g'`, `'kg'`, `'oz'`, `'lb'`).
 * @returns The corresponding Shopify `WeightUnit` (`'GRAMS'`, `'KILOGRAMS'`, `'OUNCES'`, `'POUNDS'`).
 * @throws {TodoError} When `unit` is not one of the four recognized symbols.
 */
export function unitToWeightUnit(unit: Unit): WeightUnit {
    switch (unit.toLowerCase()) {
        case 'g':
            return 'GRAMS';
        case 'kg':
            return 'KILOGRAMS';
        case 'oz':
            return 'OUNCES';
        case 'lb':
            return 'POUNDS';
        default: {
            throw new TodoError(`Unknown unit: ${unit}`);
        }
    }
}

export type Weight = {
    weight: number;
    unit: WeightUnit;
};

type LocalizeWeightOptions = {};
/**
 * Converts a weight to the preferred unit system for the active locale (imperial for US/LR/MM, metric elsewhere).
 *
 * @param locale - The active locale, used to determine the unit system via `usesImperialUnits`.
 * @param weight - The weight to convert.
 * @returns The weight in the locale-appropriate unit.
 */
export function localizeWeight(locale: Locale, weight: Weight, {}: LocalizeWeightOptions = {}): Weight {
    if (usesImperialUnits(locale)) {
        const target = weight.unit === 'GRAMS' || weight.unit === 'OUNCES' ? 'OUNCES' : 'POUNDS';
        return {
            weight: convertWeight(weight.weight, weight.unit, target),
            unit: target,
        };
    }

    const target = weight.unit === 'GRAMS' || weight.unit === 'OUNCES' ? 'GRAMS' : 'KILOGRAMS';
    return {
        weight: convertWeight(weight.weight, weight.unit, target),
        unit: target,
    };
}

/**
 * Serializes a `Weight` to a compact human-readable string (e.g., `"500g"` or `"1.5kg"`), trimming trailing decimal zeros.
 *
 * @param props - The weight to format.
 * @param props.weight - The numeric weight value.
 * @param props.unit - The Shopify `WeightUnit` that determines the appended symbol.
 * @returns A string combining the trimmed numeric value and its unit symbol.
 */
export function formatWeight({ weight, unit }: Weight): string {
    let res = weight.toFixed(2);
    if (res.endsWith('.00')) {
        res = res.slice(0, -3);
    } else if (res.includes('.') && res.endsWith('0')) {
        res = res.slice(0, -1);
    }
    return `${res}${weightUnitToUnit(unit)}`;
}

type ConvertWeightOptions = {
    round?: 'WHOLE' | 'FIVES' | false;
};
/**
 * Converts a weight value between Shopify weight units, with optional rounding.
 *
 * @param weight - The numeric weight value to convert.
 * @param from - Source Shopify `WeightUnit`.
 * @param to - Target Shopify `WeightUnit`.
 * @param options - Rounding behavior applied after conversion.
 * @param options.round - `'FIVES'` rounds up to the nearest 0.05 (default), `'WHOLE'` to the nearest 10, `false` returns the raw converted value.
 * @returns The converted weight, rounded per `options.round`.
 * @throws {TodoError} When `from` or `to` is not a recognized Shopify `WeightUnit`, or `options.round` is unrecognized.
 */
export function convertWeight(
    weight: number,
    from: WeightUnit,
    to: WeightUnit,
    { round = 'FIVES' }: ConvertWeightOptions = {},
): number {
    const fromUnit = weightUnitToUnit(from);
    const toUnit = weightUnitToUnit(to);

    const value = fromUnit !== toUnit ? ConvertUnits(weight).from(fromUnit).to(toUnit) : weight;
    switch (round) {
        case false:
            return value;
        case 'WHOLE':
            return Math.ceil(value / 10) * 10;
        case 'FIVES':
            return (Math.ceil((value * 100) / 5) * 5) / 100;
        default:
            throw new TodoError(`Unknown round option: "${round}"`);
    }
}
