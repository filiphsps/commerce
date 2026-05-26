import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { optimize } from 'svgo';

/**
 * Re-serialize every SVG in `svgs/` with four-space indentation while
 * leaving the markup semantically unchanged. SVGO runs with only
 * `cleanupAttrs` enabled so node structure is preserved but tabs and
 * stray newlines embedded inside attribute values (e.g. multi-line `d`
 * path data carried over from third-party exports) collapse to single
 * spaces. Intended as a one-shot tidy for source files that arrived
 * minified or wrapped at arbitrary widths.
 *
 * @param filePath - absolute path to the SVG file to prettify in place.
 * @returns size delta plus a flag indicating whether the file was rewritten.
 */
async function prettifySvg(filePath: string): Promise<{ changed: boolean; bytesBefore: number; bytesAfter: number }> {
    const raw = await readFile(filePath, 'utf8');
    const before = raw.replace(/\r\n?/g, '\n');
    const { data: optimized } = optimize(before, {
        plugins: ['cleanupAttrs'],
        js2svg: { pretty: true, indent: 4 },
    });
    const after = optimized.replace(/\r\n?/g, '\n');
    if (after === before) {
        return { changed: false, bytesBefore: before.length, bytesAfter: after.length };
    }
    await writeFile(filePath, after, 'utf8');
    return { changed: true, bytesBefore: before.length, bytesAfter: after.length };
}

/**
 * Walk `<packageRoot>/svgs/`, prettify each `.svg`, and print a summary.
 *
 * @throws when reading or writing any SVG fails.
 */
async function main(): Promise<void> {
    const packageRoot = resolve(fileURLToPath(import.meta.url), '..', '..');
    const svgsDir = join(packageRoot, 'svgs');
    const files = (await readdir(svgsDir))
        .filter((f) => extname(f).toLowerCase() === '.svg')
        .map((f) => join(svgsDir, f))
        .sort();

    let _changed = 0;
    for (const filePath of files) {
        const r = await prettifySvg(filePath);
        if (r.changed) _changed++;
    }
}

main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});
