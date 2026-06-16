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

/** Side-effecting dependencies, injectable so the dispatch is testable. */
export interface CliDeps {
    startLsp: (root?: string) => void;
    startMcp: (engine: AggregatorEngine) => Promise<void>;
    makeEngine: (root?: string) => AggregatorEngine;
    write: (text: string) => void;
}

const defaultDeps: CliDeps = {
    startLsp: startLspServer,
    startMcp: startMcpServer,
    makeEngine: (root) => new AggregatorEngine(loadConfig(root)),
    write: (text) => {
        process.stdout.write(text);
    },
};

/** Execute a parsed CLI result: print help/version, or start the requested server. */
export const run = async (result: CliResult, deps: CliDeps = defaultDeps): Promise<void> => {
    if (result.kind === 'help') {
        deps.write(`${USAGE}\n`);
        return;
    }
    if (result.kind === 'version') {
        deps.write(`${LSPMESH_VERSION}\n`);
        return;
    }
    if (result.mode === 'lsp') {
        deps.startLsp(result.root);
        return;
    }
    const engine = deps.makeEngine(result.root);
    await engine.init();
    await deps.startMcp(engine);
};

/* v8 ignore start -- bin bootstrap; parseCli and run are unit-tested directly. */
const main = (): Promise<void> => run(parseCli(process.argv.slice(2)));

// Only run when invoked as the bin, not when imported.
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((err: unknown) => {
        process.stderr.write(`lspmesh: ${err instanceof Error ? err.message : String(err)}\n`);
        process.exit(1);
    });
}
/* v8 ignore stop */
