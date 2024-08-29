/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
    theme: {
        fontFamily: 'var(--font-primary, var(--fallback-font))',
        extend: {
            fontFamily: {
                sans: ['var(--font-primary, var(--fallback-font))', 'sans-serif'],
                mono: ['var(--font-geist-mono)', 'monospace']
            },
            colors: {},
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
    corePlugins: {
        aspectRatio: false
    },
    plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms'), require('@tailwindcss/aspect-ratio')]
};
