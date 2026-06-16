// Minimal fake LSP server for unit tests: answers initialize, records
// didOpen/didChange versions, and returns canned results — no network, no npx.
// Run via `node --import tsx echo-lsp-server.ts`.
import { createMessageConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';

interface TextDocumentParams {
    textDocument: { uri: string; version: number };
}

const conn = createMessageConnection(new StreamMessageReader(process.stdin), new StreamMessageWriter(process.stdout));
const opened = new Map<string, number>();

conn.onRequest('initialize', () => ({ capabilities: { referencesProvider: true, workspaceSymbolProvider: true } }));
conn.onNotification('initialized', () => {});
conn.onNotification('textDocument/didOpen', (p: TextDocumentParams) => {
    opened.set(p.textDocument.uri, p.textDocument.version);
});
conn.onNotification('textDocument/didChange', (p: TextDocumentParams) => {
    opened.set(p.textDocument.uri, p.textDocument.version);
});

conn.onRequest('workspace/symbol', (p: { query: string }) => [
    {
        name: p.query,
        kind: 13,
        location: {
            uri: 'file:///fixture/a.ts',
            range: { start: { line: 0, character: 6 }, end: { line: 0, character: 6 } },
        },
    },
]);
conn.onRequest('textDocument/references', () => [
    { uri: 'file:///fixture/a.ts', range: { start: { line: 3, character: 2 }, end: { line: 3, character: 3 } } },
]);

// Test hooks: report the open version of a uri, and a request that never resolves.
conn.onRequest('$/getOpenVersion', (p: { uri: string }) => opened.get(p.uri) ?? null);
conn.onRequest('$/never', () => new Promise(() => {}));

conn.listen();
