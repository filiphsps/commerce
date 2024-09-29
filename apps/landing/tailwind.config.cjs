/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
        //
        '../../**/node_modules/@nordcom/**/dist/**/*.{js,jsx}'
    ],
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px'
            }
        },
        fontFamily: 'var(--font-primary, var(--font-fallback))',
        extend: {
            brightness: {
                65: '.65'
            },
            transitionProperty: {
                colors: 'color, background-color, border-color, text-decoration-color, fill, stroke, filter'
            },
            transitionDuration: {
                DEFAULT: '250ms'
            },
            fontFamily: {
                sans: ['var(--font-primary, var(--font-fallback))', 'sans-serif'],
                mono: ['var(--font-geist-mono)', 'monospace']
            },
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                card: {
                    DEFAULT: 'hsl(var(--color-background-highlight))',
                    foreground: 'hsl(var(--card-foreground))'
                }
            },
            borderWidth: {
                3: '3px'
            },
            strokeWidth: {
                1: '0.2rem',
                2: '0.25rem',
                3: '0.35rem'
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
    plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')]
};
