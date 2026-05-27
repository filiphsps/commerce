import { Montserrat } from 'next/font/google';

/**
 * The site's primary typeface. Matches `apps/admin/src/utils/fonts.ts` and
 * `apps/landing/src/utils/fonts.ts` so the docs site reads as part of the
 * same Nordstar family.
 */
export const primaryFont = Montserrat({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
    preload: true,
});
