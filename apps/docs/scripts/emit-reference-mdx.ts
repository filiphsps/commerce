#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
 * @returns Summary counts: subpaths written, symbols written, symbols skipped.
 */
export async function main({ quiet = false }: { quiet?: boolean } = {}): Promise<{
    subpaths: number;
    symbols: number;
    skipped: number;
}> {
    if (fs.existsSync(REFERENCE_OUT)) fs.rmSync(REFERENCE_OUT, { recursive: true, force: true });
    fs.mkdirSync(REFERENCE_OUT, { recursive: true });

    // Filled in by D3-D7.
    const subpaths = 0;
    const symbols = 0;
    const skipped = 0;

    if (!quiet) {
        console.info(`[emit-reference-mdx] ${subpaths} subpaths, ${symbols} symbols, ${skipped} skipped`);
    }
    return { subpaths, symbols, skipped };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
