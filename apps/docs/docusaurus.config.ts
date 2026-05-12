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

    plugins: [
        [
            '@docusaurus/plugin-content-docs',
            {
                id: 'storefront',
                path: '../storefront/docs',
                routeBasePath: 'docs/storefront',
                sidebarPath: './sidebars.ts',
                editUrl: 'https://github.com/filiphsps/commerce/edit/master/apps/storefront/docs/',
            },
        ],
        [
            '@docusaurus/plugin-content-docs',
            {
                id: 'admin',
                path: '../admin/docs',
                routeBasePath: 'docs/admin',
                sidebarPath: './sidebars.ts',
                editUrl: 'https://github.com/filiphsps/commerce/edit/master/apps/admin/docs/',
            },
        ],
        [
            '@docusaurus/plugin-content-docs',
            {
                id: 'landing',
                path: '../landing/docs',
                routeBasePath: 'docs/landing',
                sidebarPath: './sidebars.ts',
                editUrl: 'https://github.com/filiphsps/commerce/edit/master/apps/landing/docs/',
            },
        ],
        [
            '@docusaurus/plugin-content-docs',
            {
                id: 'db',
                path: '../../packages/db/docs',
                routeBasePath: 'docs/db',
                sidebarPath: './sidebars.ts',
                editUrl: 'https://github.com/filiphsps/commerce/edit/master/packages/db/docs/',
            },
        ],
        [
            '@docusaurus/plugin-content-docs',
            {
                id: 'errors',
                path: '../../packages/errors/docs',
                routeBasePath: 'docs/errors',
                sidebarPath: './sidebars.ts',
                editUrl: 'https://github.com/filiphsps/commerce/edit/master/packages/errors/docs/',
            },
        ],
        [
            '@docusaurus/plugin-content-docs',
            {
                id: 'shopify-graphql',
                path: '../../packages/shopify-graphql/docs',
                routeBasePath: 'docs/shopify-graphql',
                sidebarPath: './sidebars.ts',
                editUrl: 'https://github.com/filiphsps/commerce/edit/master/packages/shopify-graphql/docs/',
            },
        ],
        [
            '@docusaurus/plugin-content-docs',
            {
                id: 'shopify-html',
                path: '../../packages/shopify-html/docs',
                routeBasePath: 'docs/shopify-html',
                sidebarPath: './sidebars.ts',
                editUrl: 'https://github.com/filiphsps/commerce/edit/master/packages/shopify-html/docs/',
            },
        ],
        [
            '@docusaurus/plugin-content-docs',
            {
                id: 'marketing-common',
                path: '../../packages/marketing-common/docs',
                routeBasePath: 'docs/marketing-common',
                sidebarPath: './sidebars.ts',
                editUrl: 'https://github.com/filiphsps/commerce/edit/master/packages/marketing-common/docs/',
            },
        ],
    ],

    themeConfig: {
        image: 'img/social-card.svg',
        navbar: {
            title: 'Commerce',
            logo: { alt: 'Nordcom Commerce', src: 'img/logo.svg' },
            items: [
                { to: '/docs/getting-started', label: 'Getting Started', position: 'left' },
                {
                    type: 'dropdown',
                    label: 'Apps',
                    position: 'left',
                    items: [
                        { to: '/docs/storefront/overview', label: 'Storefront' },
                        { to: '/docs/admin/overview', label: 'Admin' },
                        { to: '/docs/landing/overview', label: 'Landing' },
                    ],
                },
                {
                    type: 'dropdown',
                    label: 'Packages',
                    position: 'left',
                    items: [
                        { to: '/docs/db/overview', label: 'db' },
                        { to: '/docs/errors/overview', label: 'errors' },
                        { to: '/docs/shopify-graphql/overview', label: 'shopify-graphql' },
                        { to: '/docs/shopify-html/overview', label: 'shopify-html' },
                        { to: '/docs/marketing-common/overview', label: 'marketing-common' },
                    ],
                },
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
