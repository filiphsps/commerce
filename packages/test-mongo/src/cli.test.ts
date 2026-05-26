import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(__dirname, './cli.ts');
const RUN = `pnpm exec tsx`;

let workDir: string;
beforeAll(() => {
    workDir = mkdtempSync(resolve(tmpdir(), 'test-mongo-cli-'));
});
afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
});

describe('test-mongo CLI', () => {
    it('`stop` is a no-op when there is no PID file', () => {
        const out = execSync(`${RUN} ${CLI} stop --dbPath ${workDir}/nope`, {
            encoding: 'utf8',
        });
        expect(out).toContain('daemon already stopped');
    });

    it('`reset` cleans the dbPath even without a daemon', () => {
        const out = execSync(`${RUN} ${CLI} reset --dbPath ${workDir}/scratch`, {
            encoding: 'utf8',
        });
        expect(out).toContain('removed');
    });

    it('prints usage for an unknown subcommand', () => {
        try {
            execSync(`${RUN} ${CLI} bogus`, { encoding: 'utf8', stdio: 'pipe' });
            throw new Error('expected non-zero exit');
        } catch (err) {
            const stderr = (err as { stderr?: Buffer }).stderr?.toString() ?? '';
            expect(stderr).toMatch(/usage: test-mongo/);
        }
    });
});
