#!/usr/bin/env tsx
import { pathToFileURL } from 'node:url';

import { main as emitTypedoc } from './emit-typedoc-json';
import { main as mirrorDocs } from './mirror-workspace-docs';
import { main as portErrors } from './port-errors';
import { main as symlinkChangelogs } from './symlink-changelogs';
import { main as emitReference } from './emit-reference-mdx';

/**
 * Orchestrate every docs content generation step in the right order. Independent
 * steps fan out via Promise.all; dependent steps wait for prerequisites. Invoked
 * by `pnpm gen` and indirectly by the `predev` / `prebuild` lifecycle hooks.
 *
 * Stages:
 *   1. Sources (parallel): typedoc JSON, workspace MDX mirror, package changelogs,
 *      and errors tab MDX port.
 *   2. Reference (depends on stage 1): per-symbol MDX emission. The symbol-index
 *      step gets sequenced before this once Phase G lands it.
 *
 * @param options.quiet - When true, individual steps suppress their own logging.
 * @returns Resolves after every stage completes; rejects on the first failure.
 */
export async function main({ quiet = false }: { quiet?: boolean } = {}): Promise<void> {
    const start = Date.now();

    await Promise.all([
        emitTypedoc({ quiet }),
        mirrorDocs({ quiet }),
        symlinkChangelogs({ quiet }),
        portErrors({ quiet }),
    ]);

    await emitReference({ quiet });

    if (!quiet) {
        console.info(`[gen] complete in ${Date.now() - start}ms`);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
