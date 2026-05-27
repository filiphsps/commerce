#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { classifySymbol } from './lib/symbol-classify';
import { renderSubpathOverviewMdx, type OverviewRow } from './lib/render-subpath-mdx';
import { renderSymbolMdx } from './lib/render-symbol-mdx';
import type { TypeDocProject } from './lib/typedoc-types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_APP = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(DOCS_APP, '../..');
const TYPEDOC_OUT = path.join(DOCS_APP, '.typedoc-out');
const REFERENCE_OUT = path.join(DOCS_APP, 'content/reference');

/**
 * Walk `.typedoc-out/*` and emit reference MDX pages. Subpath overview at
 * `content/reference/<slug>/<subpath>/index.mdx`, per-symbol pages at
 * `content/reference/<slug>/<subpath>/<symbol-kebab>.mdx`.
 *
 * @param options - Optional config; `quiet` suppresses console output.
 * @returns Summary counts: subpaths written, symbols written, symbols skipped.
 */
export async function main({ quiet = false }: { quiet?: boolean } = {}): Promise<{
    subpaths: number;
    symbols: number;
    skipped: number;
}> {
    if (fs.existsSync(REFERENCE_OUT)) fs.rmSync(REFERENCE_OUT, { recursive: true, force: true });
    fs.mkdirSync(REFERENCE_OUT, { recursive: true });

    let subpathsCount = 0;
    let symbolsCount = 0;
    let skippedCount = 0;

    const workspaceDirs = fs.readdirSync(TYPEDOC_OUT).filter((d) => fs.statSync(path.join(TYPEDOC_OUT, d)).isDirectory());
    for (const workspaceSlug of workspaceDirs) {
        const workspaceDir = path.join(TYPEDOC_OUT, workspaceSlug);
        for (const entry of walkJsonFiles(workspaceDir)) {
            const subpathRel = path.relative(workspaceDir, entry).replace(/\.json$/, '');
            const subpath = subpathRel === 'index' ? '.' : subpathRel;
            const project = JSON.parse(fs.readFileSync(entry, 'utf8')) as TypeDocProject;
            const overviewRows: OverviewRow[] = [];

            for (const symbol of project.children ?? []) {
                const { fate, kind } = classifySymbol(symbol);
                if (fate === 'excluded') {
                    skippedCount++;
                    continue;
                }
                const summary =
                    symbol.comment?.summary?.find((n) => n.kind === 'text')?.text ??
                    symbol.signatures?.[0]?.comment?.summary?.find((n) => n.kind === 'text')?.text ??
                    '';
                overviewRows.push({ name: symbol.name, kind, fate, summary });

                if (fate === 'own-page') {
                    const mdx = renderSymbolMdx({
                        workspaceSlug,
                        subpath: subpathRel === 'index' ? 'index' : subpathRel,
                        symbol,
                        kind,
                    });
                    const outFile = path.join(
                        REFERENCE_OUT,
                        workspaceSlug,
                        subpathRel === 'index' ? '' : subpathRel,
                        `${kebab(symbol.name)}.mdx`,
                    );
                    fs.mkdirSync(path.dirname(outFile), { recursive: true });
                    fs.writeFileSync(outFile, mdx);
                    symbolsCount++;
                }
            }

            const overviewMdx = renderSubpathOverviewMdx({
                workspaceSlug,
                subpath: subpathRel === 'index' ? 'index' : subpathRel,
                rows: overviewRows,
            });
            const overviewFile = path.join(
                REFERENCE_OUT,
                workspaceSlug,
                subpathRel === 'index' ? '' : subpathRel,
                'index.mdx',
            );
            fs.mkdirSync(path.dirname(overviewFile), { recursive: true });
            fs.writeFileSync(overviewFile, overviewMdx);
            subpathsCount++;
        }
    }

    if (!quiet) {
        console.info(`[emit-reference-mdx] ${subpathsCount} subpaths, ${symbolsCount} symbols, ${skippedCount} skipped`);
    }
    return { subpaths: subpathsCount, symbols: symbolsCount, skipped: skippedCount };
}

/**
 * Recursively yield the absolute paths of all `.json` files under `dir`.
 *
 * @param dir - Directory to walk.
 * @returns Generator yielding absolute file paths.
 */
function* walkJsonFiles(dir: string): Generator<string> {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) yield* walkJsonFiles(full);
        else if (entry.isFile() && entry.name.endsWith('.json')) yield full;
    }
}

/**
 * Convert a PascalCase or camelCase symbol name to kebab-case for use as
 * an MDX file name (e.g. `getArticle` → `get-article`).
 *
 * @param name - Symbol name.
 * @returns Kebab-cased string.
 */
function kebab(name: string): string {
    return name.replace(/[A-Z]/g, (m, i) => (i === 0 ? m.toLowerCase() : `-${m.toLowerCase()}`));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
