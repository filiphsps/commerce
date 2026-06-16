import type { Location } from 'vscode-languageserver-protocol';

import type { LspMeshConfig } from '../config/types.js';
import { BackendRegistry } from './backend-registry.js';
import { isDefinitionSnippet } from './definitions.js';
import { gitGrepFiles } from './git-grep.js';
import { relPath, snippet, uriToPath } from './locations.js';
import { mergeLocations } from './merge.js';
import { orderSeedFiles } from './seed.js';

/** A symbol definition surfaced by `workspace/symbol`. */
export interface SymbolResult {
    name: string;
    kind: number;
    file: string;
    line: number;
    character: number;
    snippet: string;
}

/** A reference/implementation location, tagged with the definition it resolves to. */
export interface RefResult {
    file: string;
    line: number;
    character: number;
    snippet: string;
    definedAt?: string;
}

/** A 0-based document position. */
export interface Position {
    uri: string;
    line: number;
    character: number;
}

interface RawSymbol {
    name: string;
    kind: number;
    location: { uri: string; range: { start: { line: number; character: number } } };
}

/** Shared aggregator core behind both the LSP and MCP front-ends. */
export class AggregatorEngine {
    readonly #config: LspMeshConfig;
    readonly #registry: BackendRegistry;

    constructor(config: LspMeshConfig) {
        this.#config = config;
        this.#registry = new BackendRegistry(config);
    }

    init(): Promise<void> {
        return this.#registry.init();
    }
    dispose(): Promise<void> {
        return this.#registry.dispose();
    }

    /** Fan a position-based op to every backend handling the file; merge locations. */
    async positionOp(method: string, pos: Position, extraParams: Record<string, unknown> = {}): Promise<Location[]> {
        const path = uriToPath(pos.uri);
        const backends = this.#registry.backendsFor(path);
        for (const b of backends) b.open(path);
        const replies = await Promise.all(
            backends.map((b) =>
                b
                    .request<Location[]>(method, {
                        textDocument: { uri: pos.uri },
                        position: { line: pos.line, character: pos.character },
                        ...extraParams,
                    })
                    .catch(() => null),
            ),
        );
        return mergeLocations(replies);
    }

    /** Forward a position op to every matching backend, returning raw (unmerged) replies. */
    async rawForward(method: string, pos: Position, extraParams: Record<string, unknown> = {}): Promise<unknown[]> {
        const path = uriToPath(pos.uri);
        const backends = this.#registry.backendsFor(path);
        for (const b of backends) b.open(path);
        const replies = await Promise.all(
            backends.map((b) =>
                b
                    .request(method, {
                        textDocument: { uri: pos.uri },
                        position: { line: pos.line, character: pos.character },
                        ...extraParams,
                    })
                    .catch(() => null),
            ),
        );
        return replies.filter((r) => r != null);
    }

    /** Aggregate `workspace/symbol` across ALL backends, seeding TS projects first. */
    async workspaceSymbol(query: string, opts: { definitionsOnly?: boolean } = {}): Promise<SymbolResult[]> {
        // Seed: open the definition-likely files so lazy TS projects load.
        const files = await gitGrepFiles(query, this.#config.root);
        const { ordered } = orderSeedFiles(files, query);
        for (const rel of ordered) {
            const abs = `${this.#config.root}/${rel}`;
            for (const b of this.#registry.backendsFor(abs)) b.open(abs);
        }

        const replies = await Promise.all(
            this.#registry.all().map((b) => b.request<RawSymbol[]>('workspace/symbol', { query }).catch(() => null)),
        );
        const seen = new Set<string>();
        let results: SymbolResult[] = [];
        for (const reply of replies) {
            for (const s of reply ?? []) {
                if (!(s.name === query || s.name.endsWith(`.${query}`) || s.name.endsWith(`::${query}`))) continue;
                const loc = s.location;
                const key = `${loc.uri}:${loc.range.start.line}:${loc.range.start.character}`;
                if (seen.has(key)) continue;
                seen.add(key);
                results.push({
                    name: s.name,
                    kind: s.kind,
                    file: relPath(loc.uri, this.#config.root),
                    line: loc.range.start.line + 1,
                    character: loc.range.start.character + 1,
                    snippet: snippet(loc.uri, loc.range.start.line),
                });
            }
        }
        if (opts.definitionsOnly) results = results.filter((r) => isDefinitionSnippet(r.snippet));
        else
            results.sort((a, b) => (isDefinitionSnippet(b.snippet) ? 1 : 0) - (isDefinitionSnippet(a.snippet) ? 1 : 0));
        return results;
    }

    /** MCP `find_symbol` — `workspace/symbol` with the definitionsOnly option. */
    findSymbol(query: string, opts: { definitionsOnly?: boolean } = {}): Promise<SymbolResult[]> {
        return this.workspaceSymbol(query, opts);
    }

    /** MCP `find_references` — resolve every definition, union references, tag definedAt. */
    findReferences(query: string, file?: string): Promise<RefResult[]> {
        return this.#unionOverDefinitions('textDocument/references', query, file, {
            context: { includeDeclaration: true },
        });
    }

    /** MCP `find_implementations` — same union shape against `textDocument/implementation`. */
    findImplementations(query: string, file?: string): Promise<RefResult[]> {
        return this.#unionOverDefinitions('textDocument/implementation', query, file);
    }

    async #unionOverDefinitions(
        method: string,
        query: string,
        file: string | undefined,
        extra: Record<string, unknown> = {},
    ): Promise<RefResult[]> {
        const all = await this.workspaceSymbol(query);
        let defs = all.filter((d) => isDefinitionSnippet(d.snippet));
        if (defs.length === 0) defs = all;
        if (file) defs = defs.filter((d) => d.file === file);

        const seenDef = new Set<string>();
        defs = defs.filter((d) => {
            const k = `${d.file}:${d.line}`;
            if (seenDef.has(k)) return false;
            seenDef.add(k);
            return true;
        });

        const merged = new Map<string, RefResult>();
        for (const def of defs) {
            const uri = `file://${this.#config.root}/${def.file}`;
            const locs = await this.positionOp(
                method,
                { uri, line: def.line - 1, character: def.character - 1 },
                extra,
            );
            const definedAt = `${def.file}:${def.line}`;
            for (const l of locs) {
                const f = relPath(l.uri, this.#config.root);
                const line = l.range.start.line + 1;
                const character = l.range.start.character + 1;
                const key = `${f}:${line}:${character}`;
                if (merged.has(key)) continue;
                merged.set(key, { file: f, line, character, snippet: snippet(l.uri, l.range.start.line), definedAt });
            }
        }
        return [...merged.values()];
    }
}
