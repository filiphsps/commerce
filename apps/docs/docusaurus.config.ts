import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type * as Preset from '@docusaurus/preset-classic';
import type { PluginConfig } from '@docusaurus/types';
import type { Config } from '@docusaurus/types';
import { globSync } from 'glob';
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
    // Glob every workspace member with a `docs/` folder. Adding a new workspace
    // requires no edits here — drop a `docs/overview.md` next to its `src/`
    // and rerun.
    const docsFolders = globSync(['apps/*/docs', 'packages/*/docs'], {
        cwd: REPO_ROOT,
        absolute: true,
    });

    const workspaces: Workspace[] = [];

    for (const docsDir of docsFolders) {
        const relative = path.relative(REPO_ROOT, docsDir);
        const [dir, name] = relative.split(path.sep);
        if (!dir || !name || SKIP.has(name)) continue;

        const type: 'app' | 'package' = dir === 'apps' ? 'app' : 'package';

        // Look for the matching TypeDoc-emitted folder (gitignored, may be absent
        // if `pnpm typedoc` hasn't run yet — that's fine, the API section is
        // skipped for that workspace).
        const apiDir = path.join(__dirname, 'api', name, 'src');
        const apiPath = globSync('*.md', { cwd: apiDir }).length > 0 ? `./api/${name}/src` : null;

        workspaces.push({
            name,
            type,
            docsPath: path.relative(__dirname, docsDir),
            apiPath,
            repoPath: `${dir}/${name}`,
            extra: WORKSPACE_OVERRIDES[name],
        });
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
            // Function form bypasses Docusaurus' default `<editUrl><relative-path-from-siteDir>`
            // concatenation, which would emit `../../packages/db/docs/overview.md`
            // segments because our `path` is relative to apps/docs. Resolving from
            // the workspace root keeps the URL clean.
            editUrl: ({ docPath }: { docPath: string }) =>
                `${GITHUB}/edit/master/${w.repoPath}/docs/${docPath}`,
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
                    editUrl: ({ docPath }: { docPath: string }) => `${GITHUB}/edit/master/docs/${docPath}`,
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
        './plugins/tailwind.cjs',
        ...WORKSPACES.map(docsPlugin),
        ...WORKSPACES.map(apiPlugin).filter((p): p is PluginConfig => p !== null),
    ],

    themes: ['@docusaurus/theme-mermaid'],

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
                {
                    type: 'dropdown',
                    label: 'API',
                    position: 'left',
                    // Only workspaces with a TypeDoc-emitted folder show up here.
                    // TypeDoc currently only processes packages/* (see
                    // typedoc.config.mjs), so apps won't appear unless we expand
                    // the entry-point discovery there.
                    items: WORKSPACES.filter((w) => w.apiPath !== null).map((w) => ({
                        to: `/docs/${w.name}/api`,
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
