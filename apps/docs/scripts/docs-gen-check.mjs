import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_APP = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(DOCS_APP, '../..');

function run(cmd) {
    console.info(`> ${cmd}`);
    execSync(cmd, { stdio: 'inherit', cwd: DOCS_APP });
}

// 1. Run the pre-build scripts.
run('pnpm pre');

// 2. Verify that lib/page-map.generated.ts is not in a dirty state relative to HEAD.
//    (It IS tracked, unlike the .typedoc-out and (generated)/ dirs.)
const diff = execSync('git status --porcelain apps/docs/lib/page-map.generated.ts', {
    cwd: REPO_ROOT,
    encoding: 'utf8',
});
if (diff.trim()) {
    console.error('[docs:gen:check] lib/page-map.generated.ts has drift from tracked state:');
    console.error(diff);
    console.error('Run `pnpm --filter @nordcom/commerce-docs pre:page-map` and commit.');
    process.exit(1);
}
console.info('[docs:gen:check] no drift');
