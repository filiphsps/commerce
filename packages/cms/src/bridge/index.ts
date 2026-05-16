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
