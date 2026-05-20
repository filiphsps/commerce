// apps/docs/scripts/emit-typedoc-json.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Application, TSConfigReader } from 'typedoc';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_APP = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(DOCS_APP, '../..');
const OUT_ROOT = path.join(DOCS_APP, '.typedoc-out');

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.turbo', '.next', 'coverage', 'docs', 'src', 'api']);

const WATCH = process.argv.includes('--watch');

async function main() {
    const workspaces = discoverPackagesWithExports(REPO_ROOT);
    let totalSubpaths = 0;
    let warnings = 0;

    fs.rmSync(OUT_ROOT, { recursive: true, force: true });
    fs.mkdirSync(OUT_ROOT, { recursive: true });

    for (const ws of workspaces) {
        const subpaths = resolveSubpaths(ws.rootPath);
        if (subpaths.length === 0) continue;

        const entryPoints = subpaths.map((s) => s.sourceFile);

        const app = await Application.bootstrapWithPlugins(
            {
                tsconfig: path.join(DOCS_APP, 'tsconfig.typedoc.json'),
                entryPoints,
                entryPointStrategy: 'expand',
                excludeExternals: true,
                excludePrivate: true,
                excludeInternal: true,
                skipErrorChecking: true,
                logLevel: 'Warn',
            },
            [new TSConfigReader()],
        );

        const project = await app.convert();
        if (!project) {
            warnings++;
            console.warn(`[typedoc] convert failed for ${ws.slug}`);
            continue;
        }

        const serialized = app.serializer.projectToObject(project, process.cwd());

        for (const sub of subpaths) {
            const outFile = subpathJsonPath(OUT_ROOT, ws.slug, sub.subpath);
            fs.mkdirSync(path.dirname(outFile), { recursive: true });
            const filtered = filterToSubpath(serialized, sub.sourceFile);
            fs.writeFileSync(outFile, JSON.stringify(filtered, null, 2));
            totalSubpaths++;
        }
    }

    console.info(`[emit-typedoc-json] emitted ${totalSubpaths} subpath JSON files; warnings: ${warnings}`);
}

function discoverPackagesWithExports(repoRoot) {
    const out = [];
    for (const parent of ['apps', 'packages']) {
        const root = path.join(repoRoot, parent);
        if (!fs.existsSync(root)) continue;
        for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
            walk(path.join(root, entry.name), parent, [entry.name], out);
        }
    }
    return out;
}

function walk(dir, parent, segments, out) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
        out.push({ slug: segments.join('/'), rootPath: dir, parent });
        return;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
        walk(path.join(dir, entry.name), parent, [...segments, entry.name], out);
    }
}

function resolveSubpaths(workspaceRoot) {
    const pkgPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) return [];
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (!pkg.exports) return [];
    const out = [];
    if (typeof pkg.exports === 'string') {
        const file = resolveTs(workspaceRoot, pkg.exports);
        if (file) out.push({ subpath: '.', sourceFile: file });
        return out;
    }
    for (const [key, value] of Object.entries(pkg.exports)) {
        const file = resolveAny(workspaceRoot, value);
        if (file) out.push({ subpath: key, sourceFile: file });
    }
    return out;
}

function resolveAny(root, value) {
    if (typeof value === 'string') return resolveTs(root, value);
    if (Array.isArray(value)) {
        for (const v of value) {
            const r = resolveAny(root, v);
            if (r) return r;
        }
        return undefined;
    }
    if (typeof value === 'object' && value !== null) {
        for (const cond of ['types', 'source', 'import', 'default', 'require']) {
            if (cond in value) {
                const r = resolveAny(root, value[cond]);
                if (r) return r;
            }
        }
    }
    return undefined;
}

function resolveTs(root, relPath) {
    if (!relPath.endsWith('.ts') && !relPath.endsWith('.tsx')) return undefined;
    const abs = path.resolve(root, relPath);
    return fs.existsSync(abs) ? abs : undefined;
}

function subpathJsonPath(outRoot, workspaceSlug, subpath) {
    const subFs = subpath === '.' ? 'index' : subpath.replace(/^\.\//, '');
    return path.join(outRoot, workspaceSlug, `${subFs}.json`);
}

/** Reduce the project to only declarations whose source is inside this subpath's entry tree. */
function filterToSubpath(project, sourceFile) {
    const dir = path.dirname(sourceFile);
    function isInSubpath(d) {
        const src = d?.sources?.[0]?.fileName;
        return src ? path.resolve(src).startsWith(dir) : false;
    }
    const children = (project.children ?? []).filter(isInSubpath);
    return {
        name: project.name,
        kind: project.kind,
        flags: project.flags,
        children,
        groups: project.groups,
        sources: project.sources,
    };
}

if (WATCH) {
    // Simple watch: rebuild on any change under packages/**/src; debounced 500ms.
    let timer;
    fs.watch(path.join(REPO_ROOT, 'packages'), { recursive: true }, (_event, filename) => {
        if (!filename || !filename.endsWith('.ts')) return;
        clearTimeout(timer);
        timer = setTimeout(() => main().catch(console.error), 500);
    });
    main().catch(console.error);
} else {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
