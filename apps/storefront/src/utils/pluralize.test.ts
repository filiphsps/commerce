import { describe, expect, it } from 'vitest';

import { Pluralize } from '@/utils/pluralize';

describe('utils', () => {
    describe('Pluralize', () => {
        it(`should pluralize the noun when count is greater than 1`, () => {
            const count = 2;
            const noun = 'apple';
            const suffix = 's';

            const result = Pluralize({ count, noun, suffix });

            expect(result).toBe('apples');
            //expect(result).toMatchSnapshot();
        });

        it(`should not pluralize the noun when count is 1`, () => {
            const count = 1;
            const noun = 'apple';
            const suffix = 's';

            const result = Pluralize({ count, noun, suffix });

            expect(result).toBe('apple');
            //expect(result).toMatchSnapshot();
        });

        it(`should use the provided suffix when count is greater than 1`, () => {
            const count = 2;
            const noun = 'child';
            const suffix = 'ren';

            const result = Pluralize({ count, noun, suffix });

            expect(result).toBe('children');
            //expect(result).toMatchSnapshot();
        });

        it(`should not use the provided suffix when count is 1`, () => {
            const count = 1;
            const noun = 'child';
            const suffix = 'ren';

            const result = Pluralize({ count, noun, suffix });

            expect(result).toBe('child');
            //expect(result).toMatchSnapshot();
        });
    });
});
