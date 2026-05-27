import fs from 'node:fs';
import path from 'node:path';

export type ThrowSite = { errorClass: string; file: string; line: number; context: string };

/** Directories that are never scanned when walking the source tree. */
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.turbo', '.next', 'coverage', 'docs', 'public']);

/**
 * Scan packages and apps source trees for `throw new SomeError(…)` occurrences,
 * record file/line/context for use on Errors-tab "Thrown from" lists.
 * Cheap regex-based grep — false positives are acceptable (we surface the
 * line for the reader to verify).
 *
 * @param repoRoot - Absolute path to the monorepo root.
 * @returns A flat list of throw sites grouped per error class.
 */
export function collectThrowSites(repoRoot: string): ThrowSite[] {
    const out: ThrowSite[] = [];
    for (const parent of ['packages', 'apps']) {
        const root = path.join(repoRoot, parent);
        if (!fs.existsSync(root)) continue;
        walk(root, out);
    }
    return out;
}

/**
 * Recursively walk a directory tree, scanning TypeScript source files for
 * throw statements. Skips well-known non-source directories.
 *
 * @param dir - Directory to walk.
 * @param out - Accumulator for collected throw sites.
 */
function walk(dir: string, out: ThrowSite[]): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, out);
        } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
            scanFile(full, out);
        }
    }
}

/**
 * Scan a single TypeScript file for `throw new <SomeError>(…)` patterns,
 * recording each occurrence with the error class name, file path relative to
 * the monorepo root's parent, line number (1-based), and trimmed source context.
 *
 * @param file - Absolute path to the TypeScript source file.
 * @param out - Accumulator for collected throw sites.
 */
function scanFile(file: string, out: ThrowSite[]): void {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i]?.match(/throw\s+new\s+(\w*Error)\s*\(/);
        if (!m) continue;
        out.push({
            errorClass: m[1] as string,
            file: path.relative(path.dirname(path.dirname(path.dirname(file))), file),
            line: i + 1,
            context: lines[i]?.trim() ?? '',
        });
    }
}
