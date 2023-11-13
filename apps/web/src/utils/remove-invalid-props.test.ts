import { RemoveInvalidProps } from '@/utils/remove-invalid-props';
import { describe, expect, it } from 'vitest';

describe('utils', () => {
    describe('RemoveInvalidProps', () => {
        it(`should remove invalid props from an object`, () => {
            const props = {
                title: 'valid prop',
                invalidProp: 'invalid'
            };

            const result = RemoveInvalidProps(props);
            expect(result).toEqual({ title: props.title });
            expect(result).toMatchSnapshot();
        });

        it(`should not modify an object with only valid props`, () => {
            const props = {
                lang: 'en',
                title: 'Valid Prop'
            };

            const result = RemoveInvalidProps(props);
            expect(result).toEqual(props);
            expect(result).toMatchSnapshot();
        });

        it(`should return an empty object when given an empty object`, () => {
            const result = RemoveInvalidProps({});
            expect(result).toEqual({});
            expect(result).toMatchSnapshot();
        });
    });
});
