/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-primary, var(--fallback-font))']
            },
            colors: {
                primary: {
                    light: 'var(--color-primary-light)',
                    DEFAULT: 'var(--color-accent-primary)',
                    dark: 'var(--color-accent-primary-dark)',
                },
                secondary: {
                    light: 'var(--color-secondary-light)',
                    DEFAULT: 'var(--color-accent-secondary)',
                    dark: 'var(--color-accent-secondary-dark)',
                }
            },
            strokeWidth: {
                '1': '0.15rem',
                '2': '0.2rem',
                '3': '0.25rem',
            }
        }
    },
    future: {
        hoverOnlyWhenSupported: true
    },
    plugins: [import('@tailwindcss/typography')]
};
