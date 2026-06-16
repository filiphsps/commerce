import { parseArgs } from 'node:util';

import { loadConfig } from '@/config/load-config';
import { AggregatorEngine } from '@/core/engine';
import { startLspServer } from '@/lsp/server';
import { startMcpServer } from '@/mcp/server';
import { LSPMESH_VERSION } from '@/version';

export type Mode = 'lsp' | 'mcp';

/** The outcome of parsing argv: run a mode, or print help/version. */
export type CliResult = { kind: 'run'; mode: Mode; root?: string } | { kind: 'help' } | { kind: 'version' };

const USAGE = 'usage: lspmesh <lsp|mcp> [--root <dir>]';

/**
 * Parse argv (without the leading node/script entries) into a structured result.
 * Built on `node:util` parseArgs so new flags slot in without bespoke parsing.
 * @throws Error on an unknown option (parseArgs strict mode) or an invalid mode.
 */
export const parseCli = (argv: string[]): CliResult => {
    const { values, positionals } = parseArgs({
        args: argv,
        options: {
            root: { type: 'string' },
            help: { type: 'boolean', short: 'h' },
            version: { type: 'boolean', short: 'v' },
        },
        allowPositionals: true,
    });
    if (values.help) return { kind: 'help' };
    if (values.version) return { kind: 'version' };
    const mode = positionals[0];
    if (mode !== 'lsp' && mode !== 'mcp') {
        throw new Error(mode ? `unknown mode "${mode}" (${USAGE})` : USAGE);
    }
    return { kind: 'run', mode, root: values.root };
};

const main = async (): Promise<void> => {
    const result = parseCli(process.argv.slice(2));
    if (result.kind === 'help') {
        process.stdout.write(`${USAGE}\n`);
        return;
    }
    if (result.kind === 'version') {
        process.stdout.write(`${LSPMESH_VERSION}\n`);
        return;
    }
    if (result.mode === 'lsp') {
        startLspServer(result.root);
        return;
    }
    const engine = new AggregatorEngine(loadConfig(result.root));
    await engine.init();
    await startMcpServer(engine);
};

// Only run when invoked as the bin, not when imported.
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((err: unknown) => {
        process.stderr.write(`lspmesh: ${err instanceof Error ? err.message : String(err)}\n`);
        process.exit(1);
    });
}
