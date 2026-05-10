import { TodoError } from '@nordcom/commerce-errors';
import type { WeightUnit } from '@shopify/hydrogen-react/storefront-api-types';
import type { Unit } from 'convert-units';
import ConvertUnits from 'convert-units';
import type { Locale } from './locale';

export function usesImperialUnits(locale: Locale): boolean {
    return locale.country
        ? ['us', 'lr', 'mm'].includes(locale.country.toLowerCase()) // United States, Liberia, Myanmar. The rest are metric.
        : true;
}

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
