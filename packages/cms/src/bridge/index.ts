// NOTE: `./server-actions` is intentionally NOT re-exported here.
// That module declares `import 'server-only';` at the top to forbid client
// bundles from importing it. `server-only`'s package main throws
// unconditionally when loaded without the `react-server` export condition —
// which `payload generate:types` (plain Node + tsx) doesn't set. Re-
// exporting from this barrel would drag the throw into the config build
// path (this file → `../bridge` → `./server-actions`), breaking
// `pnpm generate:types` and every Vercel deploy that runs it.
//
// Callers that need the server actions import from
// `@nordcom/commerce-cms/bridge/server-actions` directly.
export { adminOnly, tenantMemberCanRead } from './access';
export { coerceMissingGroups, defaultToPlain, type MongooseAdapterOptions, mongooseAdapter } from './adapter-mongoose';
export {
    assertFieldsValid,
    assertUniqueSlugs,
    type BridgeAccess,
    type BridgeAccessCtx,
    type BridgeAdapter,
    type BridgeManifest,
    defineBridge,
} from './manifest';
export { BRIDGE_COLLECTION_PREFIX, buildBridgePlugin } from './plugin';
