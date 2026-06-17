import { describe, expect, it } from 'vitest';

import { RequestTracker } from '@/daemon/request-tracker';

/** Build an LSP/MCP stdio frame for a JSON-RPC message. */
const lsp = (msg: unknown): Buffer => {
    const body = Buffer.from(JSON.stringify(msg), 'utf8');
    return Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`), body]);
};

describe('RequestTracker', () => {
    it('reports a request outstanding until its response returns', () => {
        const t = new RequestTracker();
        t.observeToDaemon(lsp({ jsonrpc: '2.0', id: 1, method: 'textDocument/definition', params: {} }));
        expect(t.outstanding().map((m) => m.id)).toEqual([1]);
        t.observeFromDaemon(lsp({ jsonrpc: '2.0', id: 1, result: [] }));
        expect(t.outstanding()).toHaveLength(0);
    });

    it('ignores notifications (no id)', () => {
        const t = new RequestTracker();
        t.observeToDaemon(lsp({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {} }));
        expect(t.outstanding()).toHaveLength(0);
    });

    it('reassembles a request split across two chunks', () => {
        const t = new RequestTracker();
        const buf = lsp({ jsonrpc: '2.0', id: 7, method: 'textDocument/hover', params: {} });
        t.observeToDaemon(buf.subarray(0, 10));
        t.observeToDaemon(buf.subarray(10));
        expect(t.outstanding().map((m) => m.id)).toEqual([7]);
    });

    it('a response with no matching pending id is a harmless no-op', () => {
        const t = new RequestTracker();
        // No request was ever sent for id 99.
        t.observeFromDaemon(lsp({ jsonrpc: '2.0', id: 99, result: null }));
        expect(t.outstanding()).toHaveLength(0);
    });
});
