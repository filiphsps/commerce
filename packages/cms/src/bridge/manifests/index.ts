import type { BridgeManifest } from '../manifest';
import { shopBridge } from './shop';

export { shopBridge, stripCommerceProviderSecrets } from './shop';

export const defaultManifests: readonly BridgeManifest[] = [shopBridge as unknown as BridgeManifest];
