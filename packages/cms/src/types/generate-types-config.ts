/**
 * Minimal Payload config used by `payload generate:types`. The CLI imports a
 * default-exported SanitizedConfig and walks its collections; we point it at
 * the same `buildPayloadConfig` builder the apps use, with fake credentials
 * — the CLI never connects to Mongo, just inspects schemas.
 *
 * No 'server-only' import: the CLI runs in a plain Node context.
 *
 * Why the explicit locale list: runtime locales are env-driven via
 * `NORDCOM_CMS_LOCALES`, so without an override the generated locale union
 * would shift based on whoever ran the command. We pin a wide superset here
 * so the committed `payload-types.ts` is deterministic across machines.
 *
 * Why the explicit output path: Payload's CLI silently ignores the `--output`
 * flag and falls back to `<cwd>/payload-types.ts`, dumping the file at the
 * package root instead of next to this config. Threading the absolute path
 * through `typescript.outputFile` is the only reliable way to land it under
 * `src/types/`.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPayloadConfig } from '../config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TYPEGEN_LOCALES = ['en-US', 'sv', 'de', 'es', 'fr', 'no'];

export default buildPayloadConfig({
    secret: 'generate-types-only',
    mongoUrl: 'mongodb://localhost:27017/generate-types-only',
    includeAdmin: false,
    enableStorage: false,
    // Skip the bridge plugin: Payload's `generate:types` emits a non-generic
    // `BridgeShopSelect` for colon-prefixed synthesized slugs (`bridge:shop`)
    // while still referencing it as `BridgeShopSelect<false> | …`, which
    // breaks `tsc` on the generated file. The bridge has no runtime presence
    // in typegen anyway — its adapter never connects to Mongo here.
    includeBridge: false,
    locales: TYPEGEN_LOCALES,
    typescriptOutputFile: path.resolve(__dirname, 'payload-types.ts'),
});
