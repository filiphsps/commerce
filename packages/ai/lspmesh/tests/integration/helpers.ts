import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, realpathSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURE = fileURLToPath(new URL('./fixtures/workspace', import.meta.url));
// commerce/node_modules/typescript — five levels up from tests/integration/.
const REPO_TYPESCRIPT = fileURLToPath(new URL('../../../../../node_modules/typescript', import.meta.url));

/**
 * Copy the fixture workspace into a fresh tmp git repo so the engine's git-grep
 * seeding works in isolation. typescript-language-server requires a `typescript`
 * install in the workspace, so we symlink the repo's (kept out of git so the
 * seed's `git grep --untracked` skips it).
 * @returns The absolute path of the temp workspace.
 */
export const setupWorkspace = (): string => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'lspmesh-ws-')));
    cpSync(FIXTURE, dir, { recursive: true });
    execFileSync('git', ['init', '-q'], { cwd: dir });
    execFileSync('git', ['add', '-A'], { cwd: dir });
    execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'fixture'], { cwd: dir });
    mkdirSync(join(dir, 'node_modules'), { recursive: true });
    symlinkSync(REPO_TYPESCRIPT, join(dir, 'node_modules', 'typescript'), 'dir');
    return dir;
};
