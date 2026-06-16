import { spawn } from 'node:child_process';

/** Repo-relative TS/TSX files mentioning `query` as a word (tracked + untracked). */
export const gitGrepFiles = (query: string, root: string): Promise<string[]> =>
    new Promise((resolve) => {
        const git = spawn(
            'git',
            ['grep', '-l', '--untracked', '-w', '-F', '-e', query, '--', '*.ts', '*.tsx', '*.mts', '*.cts'],
            {
                cwd: root,
            },
        );
        let out = '';
        git.stdout?.on('data', (d) => {
            out += d;
        });
        git.on('close', () => resolve(out.split('\n').filter(Boolean)));
        git.on('error', () => resolve([]));
    });
