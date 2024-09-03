import { describe, expect, it } from 'vitest';

import { convertPrismicDateToISO } from '@/utils/prismic-date';

describe('convertPrismicDateToISO', () => {
    it('should convert the non-standard Prismic date format to ISO-8601', () => {
        const date = '2022-01-01T12:00:00+0200';
        const expected = '2022-01-01T10:00:00.000Z';

        const result = convertPrismicDateToISO(date);

        expect(result).toEqual(expected);
    });

    it('should throw on invalid date format', () => {
        const date = 'invalid-date';

        expect(() => convertPrismicDateToISO(date)).toThrow();
    });
});
