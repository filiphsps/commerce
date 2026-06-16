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
import { readFileSync } from 'node:fs';

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
    #opened = new Set();
    #ready;

    constructor() {
        const bin = process.env.TYPESCRIPT_LANGUAGE_SERVER_BIN || 'typescript-language-server';
        this.#proc = spawn(bin, ['--stdio'], { cwd: ROOT });
        this.#proc.stdout.on('data', (chunk) => this.#onData(chunk));
        this.#proc.stderr.on('data', () => {});
        this.#proc.on('exit', (code) => log(`tsserver exited: ${code}`));
        this.#ready = this.#initialize();
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
                if (msg.id !== undefined && this.#pending.has(msg.id)) {
                    this.#pending.get(msg.id)(msg);
                    this.#pending.delete(msg.id);
                }
            } catch {
                /* ignore non-JSON / partial */
            }
        }
    }

    #write(msg) {
        const body = Buffer.from(JSON.stringify(msg), 'utf8');
        this.#proc.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
        this.#proc.stdin.write(body);
    }

    /** Send a request and resolve with the response message. */
    request(method, params) {
        const id = this.#nextId++;
        return new Promise((resolve) => {
            this.#pending.set(id, resolve);
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

    /** didOpen a file once, loading its TS project so navto can see it. */
    open(path) {
        if (this.#opened.has(path)) return;
        this.#opened.add(path);
        let text;
        try {
            text = readFileSync(path, 'utf8');
        } catch {
            return;
        }
        this.notify('textDocument/didOpen', {
            textDocument: { uri: `file://${path}`, languageId: languageId(path), version: 1, text }
        });
    }

    whenReady() {
        return this.#ready;
    }
}

// `git grep` (not ripgrep — `rg` is a Claude Code shell function, not a binary
// on PATH for spawned processes; `git` is reliably available). `--untracked`
// covers new files not yet committed. Returns repo-relative paths, capped.
/** Grep tracked+untracked TS files mentioning a symbol; returns abs paths, capped. */
const seedFiles = (query, cap = 40) =>
    new Promise((resolve) => {
        const git = spawn(
            'git',
            ['grep', '-l', '--untracked', '-w', '-F', '-e', query, '--', '*.ts', '*.tsx', '*.mts', '*.cts'],
            { cwd: ROOT }
        );
        let out = '';
        git.stdout.on('data', (d) => (out += d));
        git.on('close', () => {
            const files = out
                .split('\n')
                .filter(Boolean)
                .slice(0, cap)
                .map((rel) => `${ROOT}/${rel}`);
            resolve(files);
        });
        git.on('error', () => resolve([]));
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

const client = new LspClient();

/**
 * Find a symbol by exact name across the workspace: seed its projects via
 * ripgrep, then poll workspace/symbol until results arrive or we time out.
 * @returns {Promise<Array<{name,kind,file,line,character,snippet}>>}
 */
const findSymbol = async (query) => {
    await client.whenReady();
    for (const f of await seedFiles(query)) client.open(f);

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
    return symbols.map((s) => {
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

/**
 * Find all references to a symbol across the monorepo. Resolves EVERY distinct
 * definition of the name (not just the first) and unions their references, so a
 * name shared by two unrelated symbols reports both — each reference tagged with
 * the `definedAt` location it resolves to. Pass `file` to pin a single
 * definition when a name genuinely collides and only one is wanted.
 * @param {string} query exact symbol name.
 * @param {string} [file] optional repo-relative path to restrict definitions to.
 * @returns {Promise<Array<{file,line,character,snippet,definedAt}>>}
 */
const findReferences = async (query, file) => {
    const all = await findSymbol(query);
    if (!all.length) return [];

    // Prefer definition-shaped entries; fall back to all matches (e.g. class
    // members, whose snippets don't start with a top-level keyword).
    let defs = all.filter((d) => isDefinitionSnippet(d.snippet));
    if (!defs.length) defs = all;
    if (file) defs = defs.filter((d) => d.file === file);
    if (!defs.length) return [];

    // Collapse defs sharing a file:line (an import alias re-pointing at the same
    // line) so we don't run the same references pass twice.
    const seenDef = new Set();
    defs = defs.filter((d) => {
        const k = `${d.file}:${d.line}`;
        if (seenDef.has(k)) return false;
        seenDef.add(k);
        return true;
    });

    const merged = new Map();
    for (const def of defs) {
        const uri = `${ROOT_URI}/${def.file}`;
        client.open(uri.replace('file://', ''));
        await sleep(800);
        const res = await client.request('textDocument/references', {
            textDocument: { uri },
            position: { line: def.line - 1, character: def.character - 1 },
            context: { includeDeclaration: true }
        });
        const locs = Array.isArray(res.result) ? res.result : [];
        const definedAt = `${def.file}:${def.line}`;
        for (const l of locs) {
            const f = rel(l.uri);
            const line = l.range.start.line + 1;
            const character = l.range.start.character + 1;
            const key = `${f}:${line}:${character}`;
            // First def to claim a location wins its `definedAt` tag; identical
            // locations across defs are the same physical reference.
            if (merged.has(key)) continue;
            merged.set(key, { file: f, line, character, snippet: snippet(l.uri, l.range.start.line), definedAt });
        }
    }
    return [...merged.values()];
};

const TOOLS = [
    {
        name: 'find_symbol',
        description:
            'Find where a symbol (function, type, const, class, component) is defined across the monorepo, by exact name. Returns file:line locations with a source snippet. Use this instead of the built-in LSP workspaceSymbol, which is broken.',
        inputSchema: {
            type: 'object',
            properties: { query: { type: 'string', description: 'Exact symbol name, e.g. "resolveTheme".' } },
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
                const r = await findSymbol(query);
                return r.length ? text(r) : text(`No symbol named "${query}" found.`);
            }
            if (name === 'find_references') {
                const r = await findReferences(query, args?.file);
                return r.length ? text(r) : text(`No references found for "${query}".`);
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
