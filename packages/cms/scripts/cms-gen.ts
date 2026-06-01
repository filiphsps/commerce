/**
 * Descriptor-driven CMS codegen entry point (`pnpm cms:gen`).
 *
 * Replaces the former `payload generate:types` + per-collection codegen. Writes
 * every artifact returned by {@link collectGeneratedOutputs} — the admin editor-
 * action wrappers, the storefront read-contract types (`payload-types.ts`), and
 * the Convex CMS content-table validators (`tables/cms.ts`) — all derived from
 * the CMS field descriptors and editor manifests with no Payload runtime and no
 * Mongo adapter.
 *
 * Invoke via `pnpm cms:gen` (root) or `pnpm --filter @nordcom/commerce-cms cms:gen`.
 * CI gate: `pnpm cms:gen:check`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectGeneratedOutputs } from './codegen/outputs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * Generates and writes every CMS codegen artifact.
 *
 * @returns Resolves once all files are written.
 */
const main = async (): Promise<void> => {
    const outputs = await collectGeneratedOutputs();
    for (const { path: filePath, content } of outputs) {
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, content, 'utf-8');
        // biome-ignore lint/suspicious/noConsole: codegen script intentionally logs progress
        console.log(`[cms-gen] wrote ${path.relative(REPO_ROOT, filePath)}`);
    }
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
