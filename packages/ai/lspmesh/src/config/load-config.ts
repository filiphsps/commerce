import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { DEFAULT_CONFIG } from './default-config.js';
import type { BackendConfig, LspMeshConfig } from './types.js';

const CONFIG_FILENAME = 'lspmesh.json';

/** Walk from `start` up to the filesystem root looking for {@link CONFIG_FILENAME}. */
const findConfigFile = (start: string): string | undefined => {
    let dir = start;
    for (;;) {
        const candidate = join(dir, CONFIG_FILENAME);
        if (existsSync(candidate)) return candidate;
        const parent = dirname(dir);
        if (parent === dir) return undefined;
        dir = parent;
    }
};

/** Validate one backend entry, throwing on the first problem. */
const validateBackend = (b: unknown, i: number): BackendConfig => {
    const e = b as Partial<BackendConfig>;
    if (!e || typeof e.name !== 'string') throw new Error(`lspmesh: backend[${i}] is missing "name".`);
    if (typeof e.command !== 'string') throw new Error(`lspmesh: backend "${e.name}" is missing "command".`);
    if (!Array.isArray(e.args)) throw new Error(`lspmesh: backend "${e.name}" is missing an "args" array.`);
    if (!e.extensionToLanguage || typeof e.extensionToLanguage !== 'object') {
        throw new Error(`lspmesh: backend "${e.name}" is missing "extensionToLanguage".`);
    }
    return e as BackendConfig;
};

/**
 * Resolve the lspmesh config for a working directory. Reads the nearest
 * `lspmesh.json` (searching upward); falls back to the built-in default rooted at
 * `cwd` when none exists.
 * @param cwd Directory to resolve from; defaults to `process.cwd()`.
 * @returns The resolved configuration, rooted at the config's directory (or `cwd`).
 * @throws Error when a discovered config is malformed.
 */
export const loadConfig = (cwd: string = process.cwd()): LspMeshConfig => {
    const file = findConfigFile(cwd);
    if (!file) return { root: cwd, backends: DEFAULT_CONFIG.backends.map((b) => ({ ...b })) };

    const raw = JSON.parse(readFileSync(file, 'utf8')) as { backends?: unknown };
    if (!Array.isArray(raw.backends)) throw new Error(`lspmesh: ${file} has no "backends" array.`);
    const backends = raw.backends.map(validateBackend);
    return { root: dirname(file), backends };
};
