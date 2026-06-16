import { type ChildProcess, spawn } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

import {
    createMessageConnection,
    type MessageConnection,
    StreamMessageReader,
    StreamMessageWriter,
} from 'vscode-jsonrpc/node';

import type { BackendConfig } from '../config/types.js';
import { languageIdFor, matchesBackend } from './routing.js';

const DEFAULT_TIMEOUT = 45_000;

/**
 * A single backend LSP server fronted by lspmesh. Owns the child process and a
 * vscode-jsonrpc connection; tracks open documents by mtime so a changed file is
 * re-synced via didChange. Requests time out, and a dead child rejects every
 * in-flight request instead of hanging.
 */
export class BackendClient {
    readonly config: BackendConfig;
    readonly #root: string;
    readonly #proc: ChildProcess;
    readonly #conn: MessageConnection;
    readonly #ready: Promise<void>;
    #dead = false;
    #opened = new Map<string, { version: number; mtimeMs: number }>();

    constructor(config: BackendConfig, root: string) {
        this.config = config;
        this.#root = root;
        this.#proc = spawn(config.command, config.args, {
            cwd: config.cwd ?? root,
            env: { ...process.env, ...config.env },
            stdio: ['pipe', 'pipe', 'inherit'],
        });
        const stdout = this.#proc.stdout;
        const stdin = this.#proc.stdin;
        if (!stdout || !stdin) throw new Error(`lspmesh: backend "${config.name}" has no stdio pipes.`);
        this.#conn = createMessageConnection(new StreamMessageReader(stdout), new StreamMessageWriter(stdin));
        this.#conn.onClose(() => this.#die('connection closed'));
        this.#proc.on('exit', (code) => this.#die(`backend "${config.name}" exited (${code})`));
        this.#proc.on('error', (err) => this.#die(`backend "${config.name}" failed: ${err.message}`));
        this.#conn.listen();
        this.#ready = this.#initialize();
    }

    get name(): string {
        return this.config.name;
    }
    get dead(): boolean {
        return this.#dead;
    }

    /** Mark dead, tear down the connection + child, and surface the reason on stderr. */
    #die(reason: string): void {
        if (this.#dead) return;
        this.#dead = true;
        process.stderr.write(`[lspmesh] ${reason}\n`);
        this.#conn.dispose(); // rejects every pending sendRequest
        try {
            this.#proc.kill();
        } catch {
            /* already gone */
        }
    }

    async #initialize(): Promise<void> {
        await this.#conn.sendRequest('initialize', {
            processId: process.pid,
            rootUri: `file://${this.#root}`,
            workspaceFolders: [{ uri: `file://${this.#root}`, name: 'lspmesh' }],
            capabilities: {},
        });
        this.#conn.sendNotification('initialized', {});
    }

    whenReady(): Promise<void> {
        return this.#ready;
    }

    /** Whether this backend handles `path` (by extension). */
    handles(path: string): boolean {
        return matchesBackend(this.config, path);
    }

    /** Ensure the child has the current contents of `path` open (didOpen/didChange). */
    open(path: string): void {
        let mtimeMs: number;
        try {
            mtimeMs = statSync(path).mtimeMs;
        } catch {
            return;
        }
        const prev = this.#opened.get(path);
        if (prev && prev.mtimeMs === mtimeMs) return;
        let text: string;
        try {
            text = readFileSync(path, 'utf8');
        } catch {
            return;
        }
        const uri = `file://${path}`;
        const languageId = languageIdFor(this.config, path) ?? 'plaintext';
        if (!prev) {
            this.#opened.set(path, { version: 1, mtimeMs });
            this.#conn.sendNotification('textDocument/didOpen', {
                textDocument: { uri, languageId, version: 1, text },
            });
        } else {
            const version = prev.version + 1;
            this.#opened.set(path, { version, mtimeMs });
            this.#conn.sendNotification('textDocument/didChange', {
                textDocument: { uri, version },
                contentChanges: [{ text }],
            });
        }
    }

    /** Send an LSP request, rejecting on timeout or backend death. */
    async request<T = unknown>(method: string, params: unknown, timeoutMs = DEFAULT_TIMEOUT): Promise<T> {
        if (this.#dead) throw new Error(`lspmesh: backend "${this.config.name}" is not running`);
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`lspmesh: ${method} timed out after ${timeoutMs}ms`)), timeoutMs);
            timer.unref?.();
        });
        try {
            return await Promise.race([this.#conn.sendRequest<T>(method, params), timeout]);
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    /** Kill the child and release resources. */
    async dispose(): Promise<void> {
        this.#die('disposed');
    }
}
