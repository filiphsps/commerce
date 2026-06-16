/** One backend LSP server that lspmesh fronts. */
export interface BackendConfig {
    /** Unique id, e.g. `"typescript"`. */
    name: string;
    /** Executable to spawn (must speak LSP over stdio). */
    command: string;
    /** Arguments passed to {@link command}. */
    args: string[];
    /** Maps a file extension (`".ts"`) to the LSP languageId (`"typescript"`). */
    extensionToLanguage: Record<string, string>;
    /** Working directory for the child; defaults to the mesh root. */
    cwd?: string;
    /** Extra environment for the child. */
    env?: Record<string, string>;
}

/** Resolved lspmesh configuration. */
export interface LspMeshConfig {
    /** Filesystem root the mesh operates over; defaults to `process.cwd()`. */
    root: string;
    /** Backends fronted by the mesh. */
    backends: BackendConfig[];
}
