/**
 * CI drift check for `pnpm cms:gen`.
 *
 * Regenerates each file to memory and compares against what's currently
 * committed under `apps/admin/src/lib/cms-actions/_generated/`. Exits non-zero
 * on any mismatch so CI can fail the build.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateActionWrapper } from './cms-gen.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const OUTPUT_DIR = path.join(REPO_ROOT, 'apps/admin/src/lib/cms-actions/_generated');

const slugToCamel = (slug: string): string => slug.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

const main = async (): Promise<void> => {
    const { allManifests } = await import('../src/editor/manifests/index.js');
    const failures: string[] = [];
    for (const manifest of allManifests) {
        const slug = String(manifest.collection);
        const importName = `${slugToCamel(slug)}Editor`;
        const expected = generateActionWrapper({ slug, importName });
        const filePath = path.join(OUTPUT_DIR, `${slug}.ts`);
        let actual: string;
        try {
            actual = await readFile(filePath, 'utf-8');
        } catch {
            failures.push(`MISSING: ${filePath} — run \`pnpm cms:gen\``);
            continue;
        }
        if (actual !== expected) {
            failures.push(`DRIFT: ${filePath} — run \`pnpm cms:gen\``);
        }
    }
    if (failures.length > 0) {
        // biome-ignore lint/suspicious/noConsole: drift check reports failures to stderr
        console.error(failures.join('\n'));
        process.exit(1);
    }
};

main().catch((err) => {
    // biome-ignore lint/suspicious/noConsole: drift check reports failures to stderr
    console.error(err);
    process.exit(1);
});
