import { Montserrat } from 'next/font/google';

const primaryFont = Montserrat({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
    preload: true
});

export { primaryFont };
/* c8 ignore stop */
