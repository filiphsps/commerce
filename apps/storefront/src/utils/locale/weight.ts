import { TodoError } from '@nordcom/commerce-errors';

import ConvertUnits from 'convert-units';

import type { Locale } from './locale';
import type { WeightUnit } from '@shopify/hydrogen-react/storefront-api-types';
import type { Unit } from 'convert-units';

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
            unit: target
        };
    }

    const target = weight.unit === 'GRAMS' || weight.unit === 'OUNCES' ? 'GRAMS' : 'KILOGRAMS';
    return {
        weight: convertWeight(weight.weight, weight.unit, target),
        unit: target
    };
}

type ConvertWeightOptions = {
    round?: 'WHOLE' | 'FIVES' | false;
};
export function convertWeight(
    weight: number,
    from: WeightUnit,
    to: WeightUnit,
    { round = 'FIVES' }: ConvertWeightOptions = {}
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

type ConvertToLocalMeasurementSystemOptions = {
    round?: boolean;
};
/**
 * @deprecated use {@link localizeWeight} instead.
 */
export function convertToLocalMeasurementSystem({
    locale,
    weight,
    weightUnit
}: {
    locale: Locale;
    weight: number;
    weightUnit: WeightUnit;
} & ConvertToLocalMeasurementSystemOptions): string {
    const metric = !usesImperialUnits(locale);
    const unit = weightUnitToUnit(weightUnit);

    let targetUnit: Unit;
    if (metric) {
        switch (unit) {
            case 'kg':
                targetUnit = 'kg';
                break;
            case 'g':
                targetUnit = 'g';
                break;
            case 'lb':
                targetUnit = 'kg';
                break;
            case 'oz':
                targetUnit = 'g';
                break;
            default:
                throw new TodoError(`Unknown weight unit: ${unit}`);
        }
    } else {
        switch (unit) {
            case 'kg':
                targetUnit = 'lb';
                break;
            case 'g':
                targetUnit = 'oz';
                break;
            case 'lb':
                targetUnit = 'lb';
                break;
            case 'oz':
                targetUnit = 'oz';
                break;
            default:
                throw new TodoError(`Unknown weight unit: ${unit}`);
        }
    }

    weight = convertWeight(weight, weightUnit, unitToWeightUnit(targetUnit));

    let res = weight.toFixed(2).toString();
    if (res.endsWith('.00')) {
        res = res.slice(0, -3);
    } else if (res.includes('.') && res.endsWith('0')) {
        res = res.slice(0, -1);
    }

    return `${res}${targetUnit}`;
}
