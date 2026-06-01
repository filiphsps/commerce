/**
 * Drift gate for `pnpm cms:gen` (`pnpm cms:gen:check`).
 *
 * Regenerates every CMS codegen artifact to memory via the same
 * {@link collectGeneratedOutputs} the writer (`cms-gen.ts`) uses, then diffs each
 * against the committed file on disk — the admin editor-action wrappers, the
 * storefront read-contract types (`payload-types.ts`), and the Convex CMS
 * content-table validators (`tables/cms.ts`). Exits non-zero on any missing or
 * divergent file so CI fails when a descriptor changed without re-running
 * `pnpm cms:gen`. No Payload runtime, no Mongo adapter.
 *
 * Sharing {@link collectGeneratedOutputs} guarantees the gate can never disagree
 * with the writer about what's generated or where it lands.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectGeneratedOutputs } from './codegen/outputs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * Regenerates every artifact and reports any that are missing or have drifted
 * from the committed file on disk.
 *
 * @returns Exits the process non-zero (with a printed diff summary) on drift;
 *   resolves silently when every file is up to date.
 */
const main = async (): Promise<void> => {
    const outputs = await collectGeneratedOutputs();
    const failures: string[] = [];

    for (const { path: filePath, content } of outputs) {
        const rel = path.relative(REPO_ROOT, filePath);
        let actual: string;
        try {
            actual = await readFile(filePath, 'utf-8');
        } catch {
            failures.push(`MISSING: ${rel} — run \`pnpm cms:gen\``);
            continue;
        }
        if (actual !== content) {
            failures.push(`DRIFT: ${rel} — run \`pnpm cms:gen\``);
        }
    }

    if (failures.length > 0) {
        console.error(failures.join('\n'));
        process.exit(1);
    }
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
