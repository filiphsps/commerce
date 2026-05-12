import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type * as Preset from '@docusaurus/preset-classic';
import type { PluginConfig } from '@docusaurus/types';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const GITHUB = 'https://github.com/filiphsps/commerce';

/**
 * A workspace under apps/* or packages/* that has a co-located `docs/` folder.
 * Discovered at config load time so adding a new workspace requires no edits
 * here — drop a `docs/overview.md` next to its `src/` and rerun.
 */
type Workspace = {
    /** Folder name (`storefront`, `db`, …). Used for plugin id, URL slug, and label. */
    name: string;
    /** `app` (lives under `apps/*`) or `package` (lives under `packages/*`). */
    type: 'app' | 'package';
    /** Path to the handwritten docs/ folder, relative to apps/docs. */
    docsPath: string;
    /** Path to the TypeDoc-emitted folder, relative to apps/docs, or null if absent. */
    apiPath: string | null;
    /** Path to the workspace root, relative to repo root. Used for editUrl. */
    repoPath: string;
    /** Optional extra options merged into the handwritten plugin instance. */
    extra?: { exclude?: string[] };
};

/** Per-workspace overrides that can't be auto-inferred. Keep this short. */
const WORKSPACE_OVERRIDES: Record<string, { exclude?: string[] }> = {
    // Existing customer-facing error pages (served by apps/landing) live at
    // `apps/landing/docs/errors/**` and use Markdoc syntax that Docusaurus
    // can't parse. Keep them out of this site.
    landing: { exclude: ['errors/**'] },
};

/** Folders under apps/* and packages/* to ignore even if they have docs/. */
const SKIP = new Set([
    'docs', // the docs site itself
]);

function discoverWorkspaces(): Workspace[] {
    const workspaces: Workspace[] = [];

    for (const [type, dir] of [
        ['app', 'apps'],
        ['package', 'packages'],
    ] as const) {
        const root = path.join(REPO_ROOT, dir);
        if (!fs.existsSync(root)) continue;

        for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
            if (!entry.isDirectory() || SKIP.has(entry.name)) continue;

            const docsDir = path.join(root, entry.name, 'docs');
            if (!fs.existsSync(docsDir)) continue;

            const apiDir = path.join(__dirname, 'api', entry.name, 'src');
            const apiPath = fs.existsSync(apiDir) ? `./api/${entry.name}/src` : null;

            const relDocs = path.relative(__dirname, docsDir);

            workspaces.push({
                name: entry.name,
                type,
                docsPath: relDocs,
                apiPath,
                repoPath: `${dir}/${entry.name}`,
                extra: WORKSPACE_OVERRIDES[entry.name],
            });
        }
    }

    // Stable order: apps first, then packages, alphabetical within each.
    return workspaces.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'app' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
}

const WORKSPACES = discoverWorkspaces();

function appLabel(w: Workspace): string {
    return w.type === 'app' ? `${w.name[0]?.toUpperCase() ?? ''}${w.name.slice(1)}` : w.name;
}

function docsPlugin(w: Workspace): PluginConfig {
    return [
        '@docusaurus/plugin-content-docs',
        {
            id: w.name,
            path: w.docsPath,
            routeBasePath: `docs/${w.name}`,
            sidebarPath: './sidebars.ts',
            editUrl: `${GITHUB}/edit/master/${w.repoPath}/docs/`,
            ...(w.extra?.exclude ? { exclude: w.extra.exclude } : {}),
        },
    ];
}

function apiPlugin(w: Workspace): PluginConfig | null {
    if (!w.apiPath) return null;
    return [
        '@docusaurus/plugin-content-docs',
        {
            id: `${w.name}-api`,
            path: w.apiPath,
            routeBasePath: `docs/${w.name}/api`,
            sidebarPath: './sidebars.ts',
        },
    ];
}

const config: Config = {
    title: 'Nordcom Commerce',
    tagline: 'A multi-tenant, headless e-commerce platform.',
    favicon: 'img/favicon.ico',

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

    markdown: {
        mermaid: true,
    },

    presets: [
        [
            'classic',
            {
                docs: {
                    path: '../../docs',
                    routeBasePath: 'docs',
                    sidebarPath: './sidebars.ts',
                    editUrl: `${GITHUB}/edit/master/docs/`,
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
        ...WORKSPACES.map(docsPlugin),
        ...WORKSPACES.map(apiPlugin).filter((p): p is PluginConfig => p !== null),
    ],

    themes: [
        [
            '@easyops-cn/docusaurus-search-local',
            {
                hashed: true,
                indexBlog: false,
                docsRouteBasePath: ['docs', ...WORKSPACES.map((w) => `docs/${w.name}`)],
                highlightSearchTermsOnTargetPage: true,
            },
        ],
        '@docusaurus/theme-mermaid',
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
                    items: WORKSPACES.filter((w) => w.type === 'app').map((w) => ({
                        to: `/docs/${w.name}/overview`,
                        label: appLabel(w),
                    })),
                },
                {
                    type: 'dropdown',
                    label: 'Packages',
                    position: 'left',
                    items: WORKSPACES.filter((w) => w.type === 'package').map((w) => ({
                        to: `/docs/${w.name}/overview`,
                        label: appLabel(w),
                    })),
                },
                { to: '/docs/architecture', label: 'Architecture', position: 'left' },
                { href: GITHUB, label: 'GitHub', position: 'right' },
            ],
        },
        footer: {
            style: 'dark',
            links: [
                {
                    title: 'Project',
                    items: [
                        { label: 'GitHub', href: GITHUB },
                        { label: 'Issues', href: `${GITHUB}/issues` },
                        { label: 'Discussions', href: `${GITHUB}/discussions` },
                    ],
                },
                {
                    title: 'Apps',
                    items: WORKSPACES.filter((w) => w.type === 'app').map((w) => ({
                        label: appLabel(w),
                        to: `/docs/${w.name}/overview`,
                    })),
                },
                {
                    title: 'Packages',
                    items: WORKSPACES.filter((w) => w.type === 'package').map((w) => ({
                        label: appLabel(w),
                        to: `/docs/${w.name}/overview`,
                    })),
                },
            ],
            copyright: `Copyright © 2019–${new Date().getFullYear()} Filiph Siitam Sandström.`,
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
