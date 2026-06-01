import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runCli } from './cli';

let workDir: string;
let projectDir: string;

beforeEach(() => {
    workDir = mkdtempSync(resolve(tmpdir(), 'test-convex-cli-'));
    // Redirect the project-local Convex state dir `reset` wipes at a throwaway
    // directory so the test never touches the real packages/convex/.convex.
    projectDir = mkdtempSync(resolve(tmpdir(), 'test-convex-project-'));
    process.env.CONVEX_PROJECT_DIR = projectDir;
});

afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
    rmSync(projectDir, { recursive: true, force: true });
    delete process.env.CONVEX_PROJECT_DIR;
    vi.restoreAllMocks();
});

describe('test-convex CLI dispatch', () => {
    it('`stop` is a no-op when there is no PID file', async () => {
        const info = vi.spyOn(console, 'info').mockImplementation(() => {});
        const code = await runCli(['stop', '--dataDir', resolve(workDir, 'nope')]);
        expect(code).toBe(0);
        expect(info.mock.calls.flat().join(' ')).toContain('daemon already stopped');
    });

    it('`stop` prunes a stale PID file', async () => {
        const dataDir = resolve(workDir, 'stale');
        const pidFile = resolve(dataDir, '.pid');
        mkdirSync(dataDir, { recursive: true });
        // A PID that is essentially never alive.
        writeFileSync(pidFile, '999999');
        const info = vi.spyOn(console, 'info').mockImplementation(() => {});
        const code = await runCli(['stop', '--dataDir', dataDir]);
        expect(code).toBe(0);
        expect(info.mock.calls.flat().join(' ')).toContain('stale');
        expect(existsSync(pidFile)).toBe(false);
    });

    it('`reset` wipes the dataDir and the project state dir', async () => {
        const dataDir = resolve(workDir, 'scratch');
        mkdirSync(dataDir, { recursive: true });
        writeFileSync(resolve(dataDir, '.url'), 'http://127.0.0.1:3210');
        mkdirSync(resolve(projectDir, '.convex'), { recursive: true });
        const info = vi.spyOn(console, 'info').mockImplementation(() => {});

        const code = await runCli(['reset', '--dataDir', dataDir]);

        expect(code).toBe(0);
        expect(info.mock.calls.flat().join(' ')).toContain('removed');
        expect(existsSync(dataDir)).toBe(false);
        expect(existsSync(resolve(projectDir, '.convex'))).toBe(false);
    });

    it('`seed` requires --url', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const code = await runCli(['seed']);
        expect(code).toBe(1);
        expect(error.mock.calls.flat().join(' ')).toContain('--url is required');
    });

    it('prints usage and exits non-zero for an unknown subcommand', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const code = await runCli(['bogus']);
        expect(code).toBe(1);
        expect(error.mock.calls.flat().join(' ')).toMatch(/usage: test-convex/);
    });
});
