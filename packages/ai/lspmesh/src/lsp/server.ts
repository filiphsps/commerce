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

import { loadConfig } from '../config/load-config.js';
import { AggregatorEngine } from '../core/engine.js';

/**
 * Start the lspmesh LSP server over stdio. It advertises the Claude Code op set,
 * forwards position ops to every matching backend (merged), aggregates
 * `workspace/symbol` across all backends, and forwards document- and item-shaped
 * ops (documentSymbol, call hierarchy) to the backends that own the file.
 */
export const startLspServer = (): void => {
    const connection = createConnection(ProposedFeatures.all);
    const config = loadConfig();
    const engine = new AggregatorEngine(config);

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

    const pos = (p: { textDocument: { uri: string }; position: { line: number; character: number } }) => ({
        uri: p.textDocument.uri,
        line: p.position.line,
        character: p.position.character,
    });

    connection.onDefinition((p): Promise<Location[]> => engine.positionOp('textDocument/definition', pos(p)));
    connection.onImplementation((p): Promise<Location[]> => engine.positionOp('textDocument/implementation', pos(p)));
    connection.onReferences(
        (p): Promise<Location[]> => engine.positionOp('textDocument/references', pos(p), { context: p.context }),
    );

    connection.onHover(async (p): Promise<Hover | null> => {
        const replies = await engine.rawForward('textDocument/hover', pos(p));
        return (replies[0] as Hover | undefined) ?? null;
    });

    connection.onDocumentSymbol(async (p): Promise<SymbolInformation[]> => {
        const replies = await engine.forward('textDocument/documentSymbol', p.textDocument.uri, {
            textDocument: { uri: p.textDocument.uri },
        });
        return (replies[0] as SymbolInformation[] | undefined) ?? [];
    });

    connection.onWorkspaceSymbol(async (p): Promise<SymbolInformation[]> => {
        const results = await engine.workspaceSymbol(p.query);
        return results.map((r) => ({
            name: r.name,
            kind: r.kind as SymbolKind,
            location: {
                uri: `file://${config.root}/${r.file}`,
                range: {
                    start: { line: r.line - 1, character: r.character - 1 },
                    end: { line: r.line - 1, character: r.character - 1 },
                },
            },
        }));
    });

    connection.languages.callHierarchy.onPrepare(async (p): Promise<CallHierarchyItem[] | null> => {
        const replies = await engine.rawForward('textDocument/prepareCallHierarchy', pos(p));
        return (replies[0] as CallHierarchyItem[] | undefined) ?? null;
    });
    connection.languages.callHierarchy.onIncomingCalls(async (p): Promise<CallHierarchyIncomingCall[]> => {
        const replies = await engine.forward('callHierarchy/incomingCalls', p.item.uri, { item: p.item });
        return (replies[0] as CallHierarchyIncomingCall[] | undefined) ?? [];
    });
    connection.languages.callHierarchy.onOutgoingCalls(async (p): Promise<CallHierarchyOutgoingCall[]> => {
        const replies = await engine.forward('callHierarchy/outgoingCalls', p.item.uri, { item: p.item });
        return (replies[0] as CallHierarchyOutgoingCall[] | undefined) ?? [];
    });

    connection.listen();
};
