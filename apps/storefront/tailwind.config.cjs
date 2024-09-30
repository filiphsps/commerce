/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
    theme: {
        fontFamily: ['var(--font-primary, var(--font-fallback))', 'sans-serif'],
        extend: {
            zIndex: {
                5: 5
            },
            fontFamily: {
                sans: ['var(--font-primary, var(--font-fallback))', 'sans-serif']
            },
            colors: {
                primary: {
                    light: 'var(--color-accent-primary-light)',
                    DEFAULT: 'var(--color-accent-primary)',
                    dark: 'var(--color-accent-primary-dark)',
                    foreground: 'var(--color-accent-primary-text)'
                },
                secondary: {
                    light: 'var(--color-accent-secondary-light)',
                    DEFAULT: 'var(--color-accent-secondary)',
                    dark: 'var(--color-accent-secondary-dark)',
                    foreground: 'var(--color-accent-secondary-text)'
                }
            },
            strokeWidth: {
                1: '0.15rem',
                2: '0.2rem',
                3: '0.25rem'
            },
            aspectRatio: {
                '3/2': '3 / 2'
            },
            backgroundImage: {
                'sale-stripes':
                    'repeating-linear-gradient(-45deg, #DC2626 0px, #DC2626 1rem, #CB2424 1rem, #CB2424 2rem)'
            },
            animation: {}
        }
    },
    future: {
        hoverOnlyWhenSupported: true
    },
    plugins: [
        require('@tailwindcss/typography'),
        require('@tailwindcss/forms'),
        require('tailwindcss-content-visibility')
    ]
};
