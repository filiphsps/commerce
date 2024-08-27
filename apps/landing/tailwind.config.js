/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-primary, var(--fallback-font))']
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
    /*corePlugins: {
        aspectRatio: false
    },*/
    plugins: [/*import('@tailwindcss/aspect-ratio'),*/ import('@tailwindcss/typography')]
};
