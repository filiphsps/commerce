/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
    prefix: '',
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
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' }
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' }
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out'
            }
        }
    },
    future: {
        hoverOnlyWhenSupported: true
    },
    corePlugins: {
        aspectRatio: false
    },
    plugins: [
        require('@tailwindcss/typography'),
        require('@tailwindcss/forms'),
        require('@tailwindcss/aspect-ratio'),
        require('tailwindcss-animate')
    ]
};
