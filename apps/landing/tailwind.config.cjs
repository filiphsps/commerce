/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
        './node_modules/@nordcom/nordstar/**/*.{js,ts,jsx,tsx}',
        '../../node_modules/@nordcom/nordstar/**/*.{js,ts,jsx,tsx}'
    ],
    theme: {
        fontFamily: ['var(--font-primary, var(--font-fallback))', 'sans-serif'],
        extend: {
            lineHeight: {
                tight: '1.1'
            },
            fontSize: {
                '4xl': '2.35rem'
            },
            fontFamily: {
                sans: ['var(--font-primary, var(--font-fallback))', 'sans-serif'],
                mono: ['var(--font-geist-mono)', 'monospace']
            },
            colors: {
                primary: {
                    DEFAULT: 'var(--color-accent-primary)',
                    foreground: 'var(--color-accent-primary-foreground)'
                }
            },
            strokeWidth: {
                1: '0.15rem',
                2: '0.2rem',
                3: '0.25rem'
            },
            aspectRatio: {
                '3/2': '3 / 2'
            }
        }
    },
    future: {
        hoverOnlyWhenSupported: true
    },
    plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')]
};
