import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { AggregatorEngine } from '@/core/engine';
import { LSPMESH_VERSION } from '@/version';

interface McpTextResult {
    content: { type: 'text'; text: string }[];
}

const text = (value: unknown): McpTextResult => ({
    content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
});

/** A registerable MCP tool over the engine; kept separate so handlers are unit-testable. */
export interface ToolDef {
    name: string;
    description: string;
    inputSchema: Record<string, z.ZodType>;
    handler: (args: Record<string, unknown>) => Promise<McpTextResult>;
}

/** Build the lspmesh MCP tool set over the engine. */
export const buildTools = (engine: AggregatorEngine): ToolDef[] => [
    {
        name: 'find_symbol',
        description:
            'Find where a symbol is defined across the workspace, by exact name. Definitions ranked ahead of import sites; pass definitionsOnly to drop import sites.',
        inputSchema: { query: z.string(), definitionsOnly: z.boolean().optional() },
        handler: async (args) => {
            const query = args.query as string;
            const definitionsOnly = args.definitionsOnly as boolean | undefined;
            const results = await engine.findSymbol(query, { definitionsOnly });
            return text(results.length ? results : `No symbol named "${query}" found.`);
        },
    },
    {
        name: 'find_references',
        description:
            'Find all references to a symbol by exact name, unioned over every definition; each result is tagged with the definedAt it resolves to. Pass file to pin one definition.',
        inputSchema: { query: z.string(), file: z.string().optional() },
        handler: async (args) => {
            const query = args.query as string;
            const file = args.file as string | undefined;
            const results = await engine.findReferences(query, file);
            return text(results.length ? results : `No references found for "${query}".`);
        },
    },
    {
        name: 'find_implementations',
        description:
            'Find implementations of an interface or abstract member by exact name, unioned over every definition. Pass file to pin one definition.',
        inputSchema: { query: z.string(), file: z.string().optional() },
        handler: async (args) => {
            const query = args.query as string;
            const file = args.file as string | undefined;
            const results = await engine.findImplementations(query, file);
            return text(results.length ? results : `No implementations found for "${query}".`);
        },
    },
];

/** Build the lspmesh MCP server exposing by-name search over the engine. */
export const buildMcpServer = (engine: AggregatorEngine): McpServer => {
    const server = new McpServer({ name: 'lspmesh', version: LSPMESH_VERSION });
    for (const t of buildTools(engine)) {
        server.registerTool(t.name, { description: t.description, inputSchema: t.inputSchema }, t.handler as never);
    }
    return server;
};

/* v8 ignore start -- thin stdio transport bootstrap; buildMcpServer (the tool
   wiring) is unit-tested and the server runs end to end in the integration suite. */
/** Start the MCP server over stdio. */
export const startMcpServer = async (engine: AggregatorEngine): Promise<void> => {
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const server = buildMcpServer(engine);
    await server.connect(new StdioServerTransport());
};
/* v8 ignore stop */
