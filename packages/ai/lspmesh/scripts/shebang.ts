// Postbuild: ensure the built CLI entry is directly executable as `lspmesh`.
// vite/rolldown does not reliably emit a per-entry shebang, so we prepend it
// here and mark the file executable. Run via tsx (see package.json `postbuild`).
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SHEBANG = '#!/usr/bin/env node\n';
const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));

if (!existsSync(cli)) {
    process.stderr.write('lspmesh shebang: dist/cli.js not found — skipping.\n');
    process.exit(0);
}

const src = readFileSync(cli, 'utf8');
if (!src.startsWith('#!')) writeFileSync(cli, `${SHEBANG}${src}`);
chmodSync(cli, 0o755);
