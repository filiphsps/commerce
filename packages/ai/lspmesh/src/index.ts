export { DEFAULT_CONFIG } from '@/config/default-config';
export { loadConfig } from '@/config/load-config';
export type { BackendConfig, LspMeshConfig } from '@/config/types';
export { AggregatorEngine, type Position, type RefResult, type SymbolResult } from '@/core/engine';
export { startLspServer } from '@/lsp/server';
export { buildMcpServer, startMcpServer } from '@/mcp/server';
export { LSPMESH_VERSION } from '@/version';
