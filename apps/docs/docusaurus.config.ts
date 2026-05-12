import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
    title: 'Nordcom Commerce',
    tagline: 'A multi-tenant, headless e-commerce platform.',
    favicon: 'img/favicon.svg',

    url: 'https://filiphsps.github.io',
    baseUrl: '/commerce/',
    organizationName: 'filiphsps',
    projectName: 'commerce',
    trailingSlash: true,

    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'throw',
    onBrokenAnchors: 'warn',

    i18n: {
        defaultLocale: 'en',
        locales: ['en'],
    },

    presets: [
        [
            'classic',
            {
                docs: {
                    path: '../../docs',
                    routeBasePath: 'docs',
                    sidebarPath: './sidebars.ts',
                    editUrl: 'https://github.com/filiphsps/commerce/edit/master/docs/',
                    exclude: ['superpowers/**'],
                },
                blog: false,
                theme: {
                    customCss: './src/css/custom.css',
                },
            } satisfies Preset.Options,
        ],
    ],

    themeConfig: {
        image: 'img/social-card.svg',
        navbar: {
            title: 'Commerce',
            logo: { alt: 'Nordcom Commerce', src: 'img/logo.svg' },
            items: [
                { to: '/docs/getting-started', label: 'Getting Started', position: 'left' },
                { to: '/docs/architecture', label: 'Architecture', position: 'left' },
                {
                    href: 'https://github.com/filiphsps/commerce',
                    label: 'GitHub',
                    position: 'right',
                },
            ],
        },
        footer: {
            style: 'dark',
            copyright: `Copyright © ${new Date().getFullYear()} Filiph Siitam Sandström.`,
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
            additionalLanguages: ['bash', 'tsx', 'graphql'],
        },
        colorMode: {
            defaultMode: 'dark',
            respectPrefersColorScheme: true,
        },
    } satisfies Preset.ThemeConfig,
};

export default config;
