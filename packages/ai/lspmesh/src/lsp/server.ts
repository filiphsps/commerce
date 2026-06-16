import {
    type CallHierarchyIncomingCall,
    type CallHierarchyItem,
    type CallHierarchyOutgoingCall,
    createConnection,
    type Hover,
    type InitializeResult,
    type Location,
    ProposedFeatures,
    type SymbolInformation,
    type SymbolKind,
    TextDocumentSyncKind,
} from 'vscode-languageserver/node';

import { loadConfig } from '@/config/load-config';
import { AggregatorEngine } from '@/core/engine';

interface PositionParams {
    textDocument: { uri: string };
    position: { line: number; character: number };
}
interface ReferenceParams extends PositionParams {
    context: { includeDeclaration: boolean };
}
interface DocumentParams {
    textDocument: { uri: string };
}
interface ItemParams {
    item: CallHierarchyItem;
}

/** The lspmesh LSP request handlers, decoupled from the stdio connection for testing. */
export interface LspHandlers {
    definition(p: PositionParams): Promise<Location[]>;
    implementation(p: PositionParams): Promise<Location[]>;
    references(p: ReferenceParams): Promise<Location[]>;
    hover(p: PositionParams): Promise<Hover | null>;
    documentSymbol(p: DocumentParams): Promise<SymbolInformation[]>;
    workspaceSymbol(p: { query: string }): Promise<SymbolInformation[]>;
    prepareCallHierarchy(p: PositionParams): Promise<CallHierarchyItem[] | null>;
    incomingCalls(p: ItemParams): Promise<CallHierarchyIncomingCall[]>;
    outgoingCalls(p: ItemParams): Promise<CallHierarchyOutgoingCall[]>;
}

const toPos = (p: PositionParams) => ({
    uri: p.textDocument.uri,
    line: p.position.line,
    character: p.position.character,
});

/**
 * Build the LSP request handlers over an engine: position ops fan to every
 * matching backend (merged), `workspace/symbol` aggregates across all backends,
 * and document/item-shaped ops forward to the backends that own the file.
 */
export const createLspHandlers = (engine: AggregatorEngine, root: string): LspHandlers => ({
    definition: (p) => engine.positionOp('textDocument/definition', toPos(p)),
    implementation: (p) => engine.positionOp('textDocument/implementation', toPos(p)),
    references: (p) => engine.positionOp('textDocument/references', toPos(p), { context: p.context }),
    hover: async (p) => {
        const replies = await engine.rawForward('textDocument/hover', toPos(p));
        return (replies[0] as Hover | undefined) ?? null;
    },
    documentSymbol: async (p) => {
        const replies = await engine.forward('textDocument/documentSymbol', p.textDocument.uri, {
            textDocument: { uri: p.textDocument.uri },
        });
        return (replies[0] as SymbolInformation[] | undefined) ?? [];
    },
    workspaceSymbol: async (p) => {
        const results = await engine.workspaceSymbol(p.query);
        return results.map((r) => ({
            name: r.name,
            kind: r.kind as SymbolKind,
            location: {
                uri: `file://${root}/${r.file}`,
                range: {
                    start: { line: r.line - 1, character: r.character - 1 },
                    end: { line: r.line - 1, character: r.character - 1 },
                },
            },
        }));
    },
    prepareCallHierarchy: async (p) => {
        const replies = await engine.rawForward('textDocument/prepareCallHierarchy', toPos(p));
        return (replies[0] as CallHierarchyItem[] | undefined) ?? null;
    },
    incomingCalls: async (p) => {
        const replies = await engine.forward('callHierarchy/incomingCalls', p.item.uri, { item: p.item });
        return (replies[0] as CallHierarchyIncomingCall[] | undefined) ?? [];
    },
    outgoingCalls: async (p) => {
        const replies = await engine.forward('callHierarchy/outgoingCalls', p.item.uri, { item: p.item });
        return (replies[0] as CallHierarchyOutgoingCall[] | undefined) ?? [];
    },
});

/* v8 ignore start -- thin stdio transport wiring; the request logic lives in
   createLspHandlers (unit-tested) and the server is exercised end to end by the
   integration suite. */
/**
 * Start the lspmesh LSP server over stdio, advertising the Claude Code op set and
 * wiring each request to the shared aggregator engine via {@link createLspHandlers}.
 */
export const startLspServer = (root?: string): void => {
    const connection = createConnection(ProposedFeatures.all);
    const config = loadConfig(root);
    const engine = new AggregatorEngine(config);
    const handlers = createLspHandlers(engine, config.root);

    connection.onInitialize(async (): Promise<InitializeResult> => {
        await engine.init();
        return {
            capabilities: {
                textDocumentSync: TextDocumentSyncKind.Full,
                definitionProvider: true,
                referencesProvider: true,
                hoverProvider: true,
                implementationProvider: true,
                documentSymbolProvider: true,
                workspaceSymbolProvider: true,
                callHierarchyProvider: true,
            },
        };
    });
    connection.onShutdown(() => engine.dispose());
    connection.onExit(() => {
        void engine.dispose();
    });

    connection.onDefinition(handlers.definition);
    connection.onImplementation(handlers.implementation);
    connection.onReferences(handlers.references);
    connection.onHover(handlers.hover);
    connection.onDocumentSymbol(handlers.documentSymbol);
    connection.onWorkspaceSymbol(handlers.workspaceSymbol);
    connection.languages.callHierarchy.onPrepare(handlers.prepareCallHierarchy);
    connection.languages.callHierarchy.onIncomingCalls(handlers.incomingCalls);
    connection.languages.callHierarchy.onOutgoingCalls(handlers.outgoingCalls);

    connection.listen();
};
/* v8 ignore stop */
