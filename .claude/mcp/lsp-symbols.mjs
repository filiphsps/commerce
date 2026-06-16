#!/usr/bin/env node
// MCP server that restores symbol-search-by-name for the commerce monorepo.
//
// WHY: Claude Code's built-in LSP tool has no `query` parameter, so its
// `workspaceSymbol` operation always sends an empty query and returns nothing
// (claude-code#30948). The obvious off-the-shelf fix (isaacphi/mcp-language-server)
// opens every file in the workspace up front; in this 66-tsconfig monorepo that
// floods tsserver and `workspace/symbol` comes back empty.
//
// typescript-language-server lazily loads a TS project only when one of its files
// is opened, and `workspace/symbol` (tsserver navto) searches only loaded
// projects. So the reliable strategy is: ripgrep for files that mention the
// symbol, open just those (loading their projects), then run `workspace/symbol`.

import { spawn } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const ROOT = process.env.LSP_SYMBOLS_ROOT || process.cwd();
const ROOT_URI = `file://${ROOT}`;

/** @returns {string} LSP languageId for a path, defaulting to typescript. */
const languageId = (path) =>
    path.endsWith('.tsx')
        ? 'typescriptreact'
        : path.endsWith('.jsx')
          ? 'javascriptreact'
          : path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')
            ? 'javascript'
            : 'typescript';

const log = (...args) => process.stderr.write(`[lsp-symbols] ${args.join(' ')}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Thin LSP client over a typescript-language-server child process. Speaks the
 * Content-Length framed JSON-RPC the server expects and resolves requests by id.
 */
class LspClient {
    #proc;
    #buf = Buffer.alloc(0);
    #nextId = 1;
    #pending = new Map();
    #opened = new Map();
    #ready;
    #dead = false;

    constructor() {
        const bin = process.env.TYPESCRIPT_LANGUAGE_SERVER_BIN || 'typescript-language-server';
        this.#proc = spawn(bin, ['--stdio'], { cwd: ROOT });
        this.#proc.stdout.on('data', (chunk) => this.#onData(chunk));
        this.#proc.stderr.on('data', () => {});
        this.#proc.on('exit', (code) => this.#die(`tsserver exited (${code})`));
        this.#proc.on('error', (err) => this.#die(`tsserver spawn error: ${err.message}`));
        this.#ready = this.#initialize();
    }

    /** Whether the underlying tsserver has died; a dead client is replaced lazily. */
    get dead() {
        return this.#dead;
    }

    // Mark the client dead and fail every in-flight request, so callers get a
    // rejection instead of a promise that hangs forever once tsserver is gone.
    #die(reason) {
        if (this.#dead) return;
        this.#dead = true;
        log(reason);
        for (const { reject, timer } of this.#pending.values()) {
            clearTimeout(timer);
            reject(new Error(reason));
        }
        this.#pending.clear();
    }

    /** Parse Content-Length frames out of the rolling stdout buffer. */
    #onData(chunk) {
        this.#buf = Buffer.concat([this.#buf, chunk]);
        for (;;) {
            const sep = this.#buf.indexOf('\r\n\r\n');
            if (sep === -1) return;
            const header = this.#buf.subarray(0, sep).toString('ascii');
            const match = /content-length:\s*(\d+)/i.exec(header);
            if (!match) {
                this.#buf = this.#buf.subarray(sep + 4);
                continue;
            }
            const len = Number(match[1]);
            const start = sep + 4;
            if (this.#buf.length < start + len) return;
            const body = this.#buf.subarray(start, start + len).toString('utf8');
            this.#buf = this.#buf.subarray(start + len);
            try {
                const msg = JSON.parse(body);
                const p = msg.id !== undefined && this.#pending.get(msg.id);
                if (p) {
                    this.#pending.delete(msg.id);
                    clearTimeout(p.timer);
                    p.resolve(msg);
                }
            } catch {
                /* ignore non-JSON / partial */
            }
        }
    }

    #write(msg) {
        try {
            const body = Buffer.from(JSON.stringify(msg), 'utf8');
            this.#proc.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
            this.#proc.stdin.write(body);
        } catch (err) {
            // stdin closed under us (tsserver gone) — surface as death so pending
            // requests reject rather than wait out their full timeout.
            this.#die(`tsserver write failed: ${err.message}`);
        }
    }

    /**
     * Send a request and resolve with the response message. Rejects if the
     * server doesn't answer within `timeoutMs` (or dies first), so a wedged
     * tsserver can never hang a tool call forever.
     */
    request(method, params, timeoutMs = 45000) {
        if (this.#dead) return Promise.reject(new Error('tsserver not running'));
        const id = this.#nextId++;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                if (this.#pending.delete(id)) reject(new Error(`LSP ${method} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            if (timer.unref) timer.unref();
            this.#pending.set(id, { resolve, reject, timer });
            this.#write({ jsonrpc: '2.0', id, method, params });
        });
    }

    notify(method, params) {
        this.#write({ jsonrpc: '2.0', method, params });
    }

    async #initialize() {
        await this.request('initialize', {
            processId: process.pid,
            rootUri: ROOT_URI,
            workspaceFolders: [{ uri: ROOT_URI, name: 'commerce' }],
            capabilities: {
                workspace: { symbol: { symbolKind: { valueSet: Array.from({ length: 26 }, (_, i) => i + 1) } } }
            }
        });
        this.notify('initialized', {});
        log('initialized');
    }

    /**
     * Ensure tsserver has the current contents of a file open. didOpen on first
     * sight (loading its TS project so navto can see it); didChange when the file
     * changed on disk since we last opened it — the server is long-lived across a
     * session, so without this an edit mid-session yields stale positions.
     */
    open(path) {
        let mtimeMs;
        try {
            mtimeMs = statSync(path).mtimeMs;
        } catch {
            return;
        }
        const prev = this.#opened.get(path);
        if (prev && prev.mtimeMs === mtimeMs) return;

        let text;
        try {
            text = readFileSync(path, 'utf8');
        } catch {
            return;
        }
        const uri = `file://${path}`;
        if (!prev) {
            this.#opened.set(path, { version: 1, mtimeMs });
            this.notify('textDocument/didOpen', {
                textDocument: { uri, languageId: languageId(path), version: 1, text }
            });
        } else {
            const version = prev.version + 1;
            this.#opened.set(path, { version, mtimeMs });
            // Full-document sync (typescript-language-server advertises Full).
            this.notify('textDocument/didChange', {
                textDocument: { uri, version },
                contentChanges: [{ text }]
            });
        }
    }

    whenReady() {
        return this.#ready;
    }
}

// A definition almost never lives in a test/spec/mock or a built `dist/` file,
// yet those dominate git-grep hits for a popular symbol — so when we have to cap,
// defer them and keep real source first, or the cap can drop the one file that
// actually defines the symbol. Lower score = opened first.
/** @returns {number} seed priority for a repo-relative path; lower is opened first. */
/** @returns {string} a path basename minus extension, lowercased, stripped to alphanumerics. */
const normBase = (rel) => {
    const base = rel.slice(rel.lastIndexOf('/') + 1).replace(/\.[cm]?[jt]sx?$/, '').replace(/\.d$/, '');
    return base.replace(/[^a-z0-9]/gi, '').toLowerCase();
};

const seedScore = (rel, normQuery) => {
    if (/(^|\/)dist\//.test(rel)) return 4; // built output — never the source def
    if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(rel) || /(^|\/)(e2e|__tests__|__mocks__)\//.test(rel)) return 3;
    if (/\.d\.ts$/.test(rel)) return 2; // ambient decls — usually re-exports, not the def
    // The file whose basename matches the symbol (locale.ts→Locale,
    // commerce-provider.ts→CommerceProvider) almost always holds the definition,
    // so float it above the cap — git's alphabetical order otherwise buries a
    // packages/ def under hundreds of apps/ import sites for a common name.
    if (normQuery && normBase(rel) === normQuery) return -1;
    return 0;
};

// `git grep` (not ripgrep — `rg` is a Claude Code shell function, not a binary
// on PATH for spawned processes; `git` is reliably available). `--untracked`
// covers new files not yet committed.
/**
 * Grep tracked+untracked TS files mentioning a symbol, ordered so definition-
 * likely files survive the cap, then capped.
 * @returns {Promise<{files: string[], truncated: boolean, total: number}>}
 */
const seedFiles = (query, cap = 60) =>
    new Promise((resolve) => {
        const git = spawn(
            'git',
            ['grep', '-l', '--untracked', '-w', '-F', '-e', query, '--', '*.ts', '*.tsx', '*.mts', '*.cts'],
            { cwd: ROOT }
        );
        let out = '';
        git.stdout.on('data', (d) => (out += d));
        git.on('close', () => {
            const all = out.split('\n').filter(Boolean);
            const normQuery = query.replace(/[^a-z0-9]/gi, '').toLowerCase();
            // Stable sort by priority (git's path order is preserved within a tier).
            const ordered = all
                .map((rel, i) => ({ rel, i }))
                .sort((a, b) => seedScore(a.rel, normQuery) - seedScore(b.rel, normQuery) || a.i - b.i);
            const files = ordered.slice(0, cap).map(({ rel }) => `${ROOT}/${rel}`);
            resolve({ files, truncated: all.length > cap, total: all.length });
        });
        git.on('error', () => resolve({ files: [], truncated: false, total: 0 }));
    });

// LSP file URIs percent-encode path segments (e.g. Next.js `[domain]` → `%5Bdomain%5D`),
// so decode before touching the filesystem or showing the path.
/** @returns {string} filesystem path for a file:// URI. */
const uriToPath = (uri) => decodeURIComponent(uri.replace('file://', ''));

/** Read the source line at a location as a short snippet. */
const snippet = (uri, line) => {
    try {
        const lines = readFileSync(uriToPath(uri), 'utf8').split('\n');
        return (lines[line] ?? '').trim().slice(0, 200);
    } catch {
        return '';
    }
};

/** @returns {string} repo-relative path for a file:// URI. */
const rel = (uri) => uriToPath(uri).replace(`${ROOT}/`, '');

let activeClient = new LspClient();

/** Return a live client, respawning tsserver if the previous one died. */
const liveClient = () => {
    if (activeClient.dead) {
        log('respawning tsserver after prior exit');
        activeClient = new LspClient();
    }
    return activeClient;
};

/**
 * Find a symbol by exact name across the workspace: seed its projects via
 * git grep, then poll workspace/symbol until results arrive or we time out.
 * Definition-shaped entries are ranked ahead of import sites; pass
 * `definitionsOnly` to drop the import sites entirely.
 * @param {string} query exact symbol name.
 * @param {{definitionsOnly?: boolean}} [opts]
 * @returns {Promise<{results: Array<{name,kind,file,line,character,snippet}>, truncated: boolean, total: number}>}
 */
const findSymbol = async (query, { definitionsOnly = false } = {}) => {
    const client = liveClient();
    await client.whenReady();
    const seed = await seedFiles(query);
    for (const f of seed.files) client.open(f);

    // tsserver loads each seeded project lazily (~tens of seconds cold), and
    // navto stays empty until the owning project is ready — so poll generously.
    let symbols = [];
    for (let attempt = 0; attempt < 30; attempt++) {
        await sleep(2000);
        const res = await client.request('workspace/symbol', { query });
        const all = Array.isArray(res.result) ? res.result : [];
        symbols = all.filter((s) => s.name === query || s.name.endsWith(`.${query}`) || s.name.endsWith(`::${query}`));
        if (symbols.length) break;
    }
    let results = symbols.map((s) => {
        const loc = s.location;
        return {
            name: s.name,
            kind: s.kind,
            file: rel(loc.uri),
            line: loc.range.start.line + 1,
            character: loc.range.start.character + 1,
            snippet: snippet(loc.uri, loc.range.start.line)
        };
    });
    if (definitionsOnly) results = results.filter((r) => isDefinitionSnippet(r.snippet));
    // Stable sort: real definitions ahead of import sites (Array.sort is stable).
    else results.sort((a, b) => (isDefinitionSnippet(b.snippet) ? 1 : 0) - (isDefinitionSnippet(a.snippet) ? 1 : 0));
    return { results, truncated: seed.truncated, total: seed.total };
};

// An import/re-export line points at a symbol but isn't its definition; running
// references from there just re-finds the same set the real definition yields.
// Keep only definition-shaped snippets so two distinct symbols sharing a name
// surface as two distinct definitions (each gets its own references pass).
const DEFINITION_SNIPPET =
    /^(export\s+)?(default\s+)?(declare\s+)?(abstract\s+)?(async\s+)?(public\s+|private\s+|protected\s+|static\s+|readonly\s+)*(const|let|var|function|function\*|class|interface|type|enum|namespace|module)\b/;

/** @returns {boolean} whether a snippet looks like a definition, not an import/re-export. */
const isDefinitionSnippet = (snip) => {
    if (/^import\b/.test(snip) || /\bfrom\s+['"]/.test(snip)) return false;
    if (/^export\s+\{/.test(snip) || /^export\s+\*/.test(snip)) return false;
    return DEFINITION_SNIPPET.test(snip);
};

// LSP location replies come as Location (uri/range) or LocationLink
// (targetUri/targetSelectionRange) depending on the request; normalize both.
/** @returns {{uri:string, range:object}} a plain Location from either shape. */
const normLoc = (l) => (l.targetUri ? { uri: l.targetUri, range: l.targetSelectionRange || l.targetRange } : { uri: l.uri, range: l.range });

/**
 * Resolve the distinct definitions of a name: prefer definition-shaped entries,
 * fall back to all matches (e.g. class members), optionally pin to one `file`,
 * and collapse entries sharing a file:line so we never query the same spot twice.
 * @returns {Promise<Array<{file,line,character,snippet}>>}
 */
const resolveDefs = async (query, file) => {
    const { results } = await findSymbol(query);
    if (!results.length) return [];
    let defs = results.filter((d) => isDefinitionSnippet(d.snippet));
    if (!defs.length) defs = results;
    if (file) defs = defs.filter((d) => d.file === file);

    const seen = new Set();
    return defs.filter((d) => {
        const k = `${d.file}:${d.line}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
};

/**
 * Run a position-based LSP query (references/implementation) against EVERY
 * distinct definition of a name and union the locations, so a name shared by two
 * unrelated symbols reports both — each result tagged with the `definedAt` it
 * resolves to. Pass `file` to pin a single definition.
 * @returns {Promise<Array<{file,line,character,snippet,definedAt}>>}
 */
const queryLocations = async (method, query, file, params = {}) => {
    const client = liveClient();
    const defs = await resolveDefs(query, file);
    if (!defs.length) return [];

    const merged = new Map();
    for (const def of defs) {
        const uri = `${ROOT_URI}/${def.file}`;
        client.open(uri.replace('file://', ''));
        await sleep(800);
        const res = await client.request(method, {
            textDocument: { uri },
            position: { line: def.line - 1, character: def.character - 1 },
            ...params
        });
        const raw = Array.isArray(res.result) ? res.result : res.result ? [res.result] : [];
        const definedAt = `${def.file}:${def.line}`;
        for (const item of raw) {
            const l = normLoc(item);
            const f = rel(l.uri);
            const line = l.range.start.line + 1;
            const character = l.range.start.character + 1;
            const key = `${f}:${line}:${character}`;
            // First def to claim a location wins its `definedAt` tag; identical
            // locations across defs are the same physical result.
            if (merged.has(key)) continue;
            merged.set(key, { file: f, line, character, snippet: snippet(l.uri, l.range.start.line), definedAt });
        }
    }
    return [...merged.values()];
};

/**
 * All references to a symbol across the monorepo, unioned over every definition
 * of the name. Pass `file` to pin one when the name collides.
 * @returns {Promise<Array<{file,line,character,snippet,definedAt}>>}
 */
const findReferences = (query, file) =>
    queryLocations('textDocument/references', query, file, { context: { includeDeclaration: true } });

/**
 * Implementations of a symbol (interface/abstract members) by name — the
 * name-based counterpart to the built-in position-only goToImplementation.
 * @returns {Promise<Array<{file,line,character,snippet,definedAt}>>}
 */
const findImplementations = (query, file) => queryLocations('textDocument/implementation', query, file);

const TOOLS = [
    {
        name: 'find_symbol',
        description:
            'Find where a symbol (function, type, const, class, component) is defined across the monorepo, by exact name. Returns file:line locations with a source snippet, definitions ranked ahead of import sites. Pass definitionsOnly to drop import sites. Use this instead of the built-in LSP workspaceSymbol, which is broken.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Exact symbol name, e.g. "resolveTheme".' },
                definitionsOnly: {
                    type: 'boolean',
                    description: 'Drop import/re-export sites and return only definition-shaped results. Default false.'
                }
            },
            required: ['query']
        }
    },
    {
        name: 'find_references',
        description:
            'Find all references to a symbol across the monorepo, by exact name. Resolves every distinct definition of the name and unions their references; each result is tagged with the `definedAt` location it resolves to, so a name shared by two unrelated symbols reports both. Pass `file` to restrict to the definition in one path when a name collides and you want only one.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Exact symbol name to find references for.' },
                file: {
                    type: 'string',
                    description: 'Optional repo-relative path; restricts references to the definition in this file when the name collides.'
                }
            },
            required: ['query']
        }
    },
    {
        name: 'find_implementations',
        description:
            'Find implementations of a symbol (interface or abstract member) across the monorepo, by exact name — the name-based counterpart to the built-in position-only goToImplementation. Results are tagged with the `definedAt` they resolve to. Pass `file` to pin one definition when the name collides.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Exact symbol name to find implementations of.' },
                file: {
                    type: 'string',
                    description: 'Optional repo-relative path; restricts to the definition in this file when the name collides.'
                }
            },
            required: ['query']
        }
    }
];

const text = (value) => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] });

/** Dispatch an MCP JSON-RPC request to a result, or null for notifications. */
const handle = async (msg) => {
    switch (msg.method) {
        case 'initialize':
            return {
                protocolVersion: msg.params?.protocolVersion || '2024-11-05',
                capabilities: { tools: {} },
                serverInfo: { name: 'lsp-symbols', version: '0.1.0' }
            };
        case 'notifications/initialized':
            return null;
        case 'tools/list':
            return { tools: TOOLS };
        case 'tools/call': {
            const { name, arguments: args } = msg.params;
            const query = args?.query;
            if (name === 'find_symbol') {
                const { results, truncated, total } = await findSymbol(query, { definitionsOnly: args?.definitionsOnly });
                if (!results.length) {
                    const hint = truncated ? ` (seed search capped at ${total} candidate files — try a more specific name)` : '';
                    return text(`No symbol named "${query}" found${hint}.`);
                }
                // Surface seed truncation so a partial result never reads as exhaustive.
                return truncated
                    ? text({ truncated: true, totalSeedFiles: total, results })
                    : text(results);
            }
            if (name === 'find_references') {
                const r = await findReferences(query, args?.file);
                return r.length ? text(r) : text(`No references found for "${query}".`);
            }
            if (name === 'find_implementations') {
                const r = await findImplementations(query, args?.file);
                return r.length ? text(r) : text(`No implementations found for "${query}".`);
            }
            throw new Error(`Unknown tool: ${name}`);
        }
        default:
            return null;
    }
};

const stdoutWrite = (msg) => process.stdout.write(`${JSON.stringify(msg)}\n`);

let inBuf = '';
process.stdin.on('data', async (chunk) => {
    inBuf += chunk;
    let nl;
    while ((nl = inBuf.indexOf('\n')) !== -1) {
        const line = inBuf.slice(0, nl).trim();
        inBuf = inBuf.slice(nl + 1);
        if (!line) continue;
        let msg;
        try {
            msg = JSON.parse(line);
        } catch {
            continue;
        }
        try {
            const result = await handle(msg);
            if (msg.id !== undefined && result !== null) stdoutWrite({ jsonrpc: '2.0', id: msg.id, result });
        } catch (err) {
            if (msg.id !== undefined)
                stdoutWrite({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: String(err?.message || err) } });
        }
    }
});

log(`ready; workspace root ${ROOT}`);
