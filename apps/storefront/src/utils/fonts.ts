import { Public_Sans } from 'next/font/google';

const primaryFont = Public_Sans({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
    preload: true
});

export { primaryFont };
/* c8 ignore stop */
