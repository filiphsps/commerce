import { describe, expect, it } from 'vitest';

import { useTranslation } from '@/utils/locale';

describe('utils', () => {
    describe.todo('Locale');
    describe.todo('ConvertToLocalMeasurementSystem');

    describe('useTranslation', () => {
        it('should return a translation function for a given scope and dictionary', () => {
            const dictionary = {
                common: {
                    hello: 'Hello',
                    world: 'World'
                },
                cart: {
                    welcome: 'Welcome to the homepage'
                }
            } as any;

            const { t: cartT }: any = useTranslation('cart', dictionary);
            const { t: commonT }: any = useTranslation('common' as any, dictionary);

            expect(cartT('welcome')).toEqual('Welcome to the homepage');
            expect(commonT('hello')).toEqual('Hello');
            expect(commonT('world')).toEqual('World');
            expect(cartT('invalid.key')).toEqual('invalid.key');
        });
    });
});
