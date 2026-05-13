/**
 * Minimal Payload config used by `payload generate:types`. The CLI imports a
 * default-exported SanitizedConfig and walks its collections; we point it at
 * the same `buildPayloadConfig` builder the apps use, with fake credentials
 * — the CLI never connects to Mongo, just inspects schemas.
 *
 * No 'server-only' import: the CLI runs in a plain Node context.
 */

import { buildPayloadConfig } from '../config';

export default buildPayloadConfig({
    secret: 'generate-types-only',
    mongoUrl: 'mongodb://localhost:27017/generate-types-only',
    includeAdmin: false,
    enableStorage: false,
});
