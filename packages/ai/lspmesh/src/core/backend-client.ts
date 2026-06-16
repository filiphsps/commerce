import { type ChildProcess, spawn } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { Writable } from 'node:stream';

import {
    createMessageConnection,
    type MessageConnection,
    StreamMessageReader,
    StreamMessageWriter,
} from 'vscode-jsonrpc/node';

import type { BackendConfig } from '@/config/types';
import { languageIdFor, matchesBackend } from '@/core/routing';

const DEFAULT_TIMEOUT = 45_000;

/**
 * Wraps a child's stdin so a write issued after the pipe is destroyed (during teardown) resolves
 * silently instead of rejecting with `ERR_STREAM_DESTROYED`. vscode-jsonrpc serializes writes on an
 * internal promise chain whose eventual rejection has no catch, so a queued write landing after the
 * child is killed surfaces as an unhandled rejection that fails the whole test run. Dropping
 * post-destroy writes (and swallowing any write-callback error) keeps that chain from ever rejecting.
 *
 * @param stream - The child's stdin pipe.
 * @returns A Writable that forwards to `stream` while open and drops writes once it is destroyed or ended.
 */
export function dropWritesAfterDestroy(stream: Writable): Writable {
    return new Writable({
        write(chunk, encoding, callback) {
            if (stream.destroyed || stream.writableEnded) {
                callback();
                return;
            }
            stream.write(chunk, encoding, () => callback());
        },
    });
}

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
        // Swallow raw pipe failures (EPIPE / ERR_STREAM_DESTROYED) that occur when
        // the child is killed mid-write; they're expected on dispose and must not
        // bubble up as unhandled rejections.
        stdin.on('error', () => {});
        stdout.on('error', () => {});
        this.#conn = createMessageConnection(
            new StreamMessageReader(stdout),
            new StreamMessageWriter(dropWritesAfterDestroy(stdin)),
        );
        this.#conn.onError(() => {});
        this.#conn.onClose(() => this.#die('connection closed'));
        this.#proc.on('exit', (code) => this.#die(`backend "${config.name}" exited (${code})`));
        this.#proc.on('error', (err) => this.#die(`backend "${config.name}" failed: ${err.message}`));
        this.#conn.listen();
        this.#ready = this.#initialize();
        // A respawned client's whenReady() is never awaited; guard so a failed or
        // disposed initialize never surfaces as an unhandled rejection. Awaiters
        // (registry.init) still observe the rejection via their own handler.
        this.#ready.catch(() => {});
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

    /** Fire-and-forget notification that never rejects, even if the pipe is gone. */
    #notify(method: string, params: unknown): void {
        if (this.#dead) return;
        void Promise.resolve(this.#conn.sendNotification(method, params as object)).catch(() => {});
    }

    async #initialize(): Promise<void> {
        await this.#conn.sendRequest('initialize', {
            processId: process.pid,
            rootUri: `file://${this.#root}`,
            workspaceFolders: [{ uri: `file://${this.#root}`, name: 'lspmesh' }],
            capabilities: {},
        });
        this.#notify('initialized', {});
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
            this.#notify('textDocument/didOpen', {
                textDocument: { uri, languageId, version: 1, text },
            });
        } else {
            const version = prev.version + 1;
            this.#opened.set(path, { version, mtimeMs });
            this.#notify('textDocument/didChange', {
                textDocument: { uri, version },
                contentChanges: [{ text }],
            });
        }
    }

    /** Send an LSP request, rejecting on timeout or backend death. */
    async request<T = unknown>(method: string, params: unknown, timeoutMs = DEFAULT_TIMEOUT): Promise<T> {
        if (this.#dead) throw new Error(`lspmesh: backend "${this.config.name}" is not running`);
        const req = this.#conn.sendRequest<T>(method, params);
        // If the timeout wins the race below (or the connection is later disposed),
        // this promise stays pending; attach a no-op catch so its eventual rejection
        // never surfaces as an unhandled rejection.
        req.catch(() => {});
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`lspmesh: ${method} timed out after ${timeoutMs}ms`)), timeoutMs);
            timer.unref?.();
        });
        try {
            return await Promise.race([req, timeout]);
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    /** Kill the child and release resources. */
    async dispose(): Promise<void> {
        this.#die('disposed');
    }
}
