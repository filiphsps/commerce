import type { BackendConfig, LspMeshConfig } from '@/config/types';
import { BackendClient } from '@/core/backend-client';
import { matchesBackend } from '@/core/routing';

/** Owns one {@link BackendClient} per configured backend, respawning dead ones lazily. */
export class BackendRegistry {
    readonly #config: LspMeshConfig;
    #clients = new Map<string, BackendClient>();

    constructor(config: LspMeshConfig) {
        this.#config = config;
    }

    /** Eagerly spawn + initialize every backend, logging any that fail to start. */
    async init(): Promise<void> {
        for (const b of this.#config.backends) this.#clients.set(b.name, new BackendClient(b, this.#config.root));
        const settled = await Promise.allSettled([...this.#clients.values()].map((c) => c.whenReady()));
        settled.forEach((r, i) => {
            if (r.status === 'rejected') {
                const name = this.#config.backends[i]?.name ?? 'unknown';
                process.stderr.write(`[lspmesh] backend "${name}" failed to initialize: ${r.reason}\n`);
            }
        });
    }

    /** Return the live client for a backend, respawning it if it died. */
    #live(b: BackendConfig): BackendClient {
        let client = this.#clients.get(b.name);
        if (!client || client.dead) {
            client = new BackendClient(b, this.#config.root);
            this.#clients.set(b.name, client);
        }
        return client;
    }

    /** Live clients whose extension map matches `path`. */
    backendsFor(path: string): BackendClient[] {
        return this.#config.backends.filter((b) => matchesBackend(b, path)).map((b) => this.#live(b));
    }

    /** All live clients (respawning dead ones). */
    all(): BackendClient[] {
        return this.#config.backends.map((b) => this.#live(b));
    }

    async dispose(): Promise<void> {
        await Promise.allSettled([...this.#clients.values()].map((c) => c.dispose()));
        this.#clients.clear();
    }
}
