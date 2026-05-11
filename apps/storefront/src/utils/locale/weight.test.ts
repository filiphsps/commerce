import { describe, expect, it } from 'vitest';

import {
    convertWeight,
    formatWeight,
    Locale,
    localizeWeight,
    unitToWeightUnit,
    usesImperialUnits,
    weightUnitToUnit,
} from '@/utils/locale';

describe('utils', () => {
    describe('Locale', () => {
        describe('Weight', () => {
            describe('usesImperialUnits', () => {
                it('should return true if the locale is in the US, LR or MM', () => {
                    expect(usesImperialUnits(Locale.from('en-US'))).toBe(true);
                    expect(usesImperialUnits(Locale.from('en-LR'))).toBe(true);
                    expect(usesImperialUnits(Locale.from('en-MM'))).toBe(true);
                });

                it('should return false if the locale is in the metric system', () => {
                    expect(usesImperialUnits(Locale.from('en-AU'))).toBe(false);
                    expect(usesImperialUnits(Locale.from('en-CA'))).toBe(false);
                    expect(usesImperialUnits(Locale.from('en-DE'))).toBe(false);
                    expect(usesImperialUnits(Locale.from('en-SE'))).toBe(false);
                    expect(usesImperialUnits(Locale.from('en-ZA'))).toBe(false);
                });
            });

            describe('weightUnitToUnit', () => {
                it('should convert a weight unit to a unit', () => {
                    expect(weightUnitToUnit('GRAMS')).toBe('g');
                    expect(weightUnitToUnit('KILOGRAMS')).toBe('kg');
                    expect(weightUnitToUnit('OUNCES')).toBe('oz');
                    expect(weightUnitToUnit('POUNDS')).toBe('lb');
                });

                it('should throw an error if the unit is unknown', () => {
                    expect(() => weightUnitToUnit('UNKNOWN' as any)).toThrow();
                });
            });
            describe('unitToWeightUnit', () => {
                it('should convert a unit to a weight unit', () => {
                    expect(unitToWeightUnit('g')).toBe('GRAMS');
                    expect(unitToWeightUnit('kg')).toBe('KILOGRAMS');
                    expect(unitToWeightUnit('oz')).toBe('OUNCES');
                    expect(unitToWeightUnit('lb')).toBe('POUNDS');
                });

                it('should throw an error if the unit is unknown', () => {
                    expect(() => unitToWeightUnit('UNKNOWN' as any)).toThrow();
                });
            });

            describe('localizeWeight', () => {
                it('should convert a weight to the local measurement system', () => {
                    expect(
                        localizeWeight(Locale.from('en-GB'), {
                            weight: 10,
                            unit: 'GRAMS',
                        }),
                    ).toEqual({
                        weight: 10,
                        unit: 'GRAMS',
                    });

                    expect(
                        localizeWeight(Locale.from('en-US'), {
                            weight: 10,
                            unit: 'GRAMS',
                        }),
                    ).toEqual({
                        weight: 0.4,
                        unit: 'OUNCES',
                    });

                    expect(
                        localizeWeight(Locale.from('en-GB'), {
                            weight: 5,
                            unit: 'OUNCES',
                        }),
                    ).toEqual({
                        weight: 141.75,
                        unit: 'GRAMS',
                    });
                    expect(
                        localizeWeight(Locale.from('en-US'), {
                            weight: 5,
                            unit: 'OUNCES',
                        }),
                    ).toEqual({
                        weight: 5,
                        unit: 'OUNCES',
                    });

                    expect(
                        localizeWeight(Locale.from('en-GB'), {
                            weight: 10,
                            unit: 'GRAMS',
                        }),
                    ).toEqual({
                        weight: 10,
                        unit: 'GRAMS',
                    });
                });
            });

            describe('convertWeight', () => {
                it('should convert from one weight unit to another', () => {
                    expect(convertWeight(10, 'GRAMS', 'KILOGRAMS', { round: false })).toBeCloseTo(0.01);
                    expect(convertWeight(10, 'KILOGRAMS', 'GRAMS', { round: false })).toBeCloseTo(10000);
                    expect(convertWeight(10, 'OUNCES', 'GRAMS', { round: false })).toBeCloseTo(283.495, 2);
                    expect(convertWeight(10, 'POUNDS', 'GRAMS', { round: false })).toBeCloseTo(4535.92, 2);
                });

                it('should not round if round is set to false', () => {
                    ['GRAMS', 'KILOGRAMS', 'OUNCES', 'POUNDS'].forEach((unit: any) => {
                        expect(convertWeight(9, unit, unit, { round: false })).toBe(9);
                        expect(convertWeight(1009, unit, unit, { round: false })).toBe(1009);
                        expect(convertWeight(0, unit, unit, { round: false })).toBe(0);
                    });
                });

                it('should round to the nearest whole number if round is set to WHOLE', () => {
                    ['GRAMS', 'KILOGRAMS', 'OUNCES', 'POUNDS'].forEach((unit: any) => {
                        expect(convertWeight(9, unit, unit, { round: 'WHOLE' })).toBe(10);
                        expect(convertWeight(1009, unit, unit, { round: 'WHOLE' })).toBe(1010);
                        expect(convertWeight(0, unit, unit, { round: 'WHOLE' })).toBe(0);
                    });
                });

                it('should round to the nearest whole number if round is set to FIVES', () => {
                    ['GRAMS', 'KILOGRAMS', 'OUNCES', 'POUNDS'].forEach((unit: any) => {
                        expect(convertWeight(9.44, unit, unit, { round: 'FIVES' })).toBe(9.45);
                        expect(convertWeight(1000.23, unit, unit, { round: 'FIVES' })).toBe(1000.25);
                        expect(convertWeight(0, unit, unit, { round: 'FIVES' })).toBe(0);
                    });
                });

                it('should throw an error if the round option is invalid', () => {
                    ['GRAMS', 'KILOGRAMS', 'OUNCES', 'POUNDS'].forEach((unit: any) => {
                        expect(() => convertWeight(9, unit, unit, { round: 'INVALID' as any })).toThrow();
                    });
                });
            });

            describe('formatWeight + localizeWeight', () => {
                const fmt = (locale: Locale, weight: number, unit: 'GRAMS' | 'KILOGRAMS' | 'OUNCES' | 'POUNDS') =>
                    formatWeight(localizeWeight(locale, { weight, unit }));

                it('should convert a value to the local measurement system', () => {
                    expect(fmt(Locale.from('en-GB'), 10, 'KILOGRAMS')).toBe('10kg');
                    expect(fmt(Locale.from('en-US'), 10, 'KILOGRAMS')).toBe('22.05lb');

                    expect(fmt(Locale.from('en-GB'), 5, 'OUNCES')).toBe('141.75g');
                    expect(fmt(Locale.from('en-US'), 5, 'OUNCES')).toBe('5oz');

                    expect(fmt(Locale.from('en-GB'), 10, 'GRAMS')).toBe('10g');
                    expect(fmt(Locale.from('en-US'), 10, 'GRAMS')).toBe('0.4oz');

                    expect(fmt(Locale.from('en-GB'), 10, 'POUNDS')).toBe('4.55kg');
                    expect(fmt(Locale.from('en-US'), 10, 'POUNDS')).toBe('10lb');
                });
            });
        });
    });
});
