import 'server-only';

import { buildFormState } from '@payloadcms/ui/utilities/buildFormState';
import type { BuildFormStateArgs } from 'payload';

/**
 * Wrapper around `buildFormState` for the co-located CMS routes.
 *
 * When we removed Payload's mounted `/cms` admin shell we also removed
 * `importMap.js` — the generated file that maps every custom-field component
 * identifier (e.g. `@payloadcms/plugin-multi-tenant/client#TenantField`) to
 * its React module. `buildFormState` with `renderAllFields: true` renders
 * each field's server component and looks the implementation up in
 * `payload.importMap`; without the map the lookup throws "Cannot read
 * properties of undefined (reading '<componentId>')".
 *
 * Our routes render fields client-side via `<RenderFields>` inside
 * `<PayloadFieldShell>` — we never use the server-rendered RSC trees that
 * `renderAllFields: true` would produce. So we pin both knobs to "do not
 * render any server-side field components":
 *
 * - `renderAllFields: false` — skip the full-tree initial render.
 * - `mockRSCs: true` — replace any remaining RSC nodes with placeholder
 *   strings so partial-render paths (e.g. arrays/blocks adding rows) also
 *   avoid the importMap lookup.
 *
 * Callers must NOT override these flags; the parameter type omits them so
 * the type system refuses any drift. If we re-introduce an importMap in
 * the future, drop both flags here and the call sites will pick up the
 * default RSC-rendering behaviour automatically.
 */
export type BuildCmsFormStateArgs = Omit<BuildFormStateArgs, 'mockRSCs' | 'renderAllFields'>;

export async function buildCmsFormState(args: BuildCmsFormStateArgs) {
    // The spread loses the `BuildFormStateArgs` discriminated union (the
    // collectionSlug/globalSlug/widgetSlug split) — narrow explicitly so we
    // call into Payload's typed entry point without weakening the wrapper's
    // own input type.
    return buildFormState({
        ...args,
        renderAllFields: false,
        mockRSCs: true,
    } as BuildFormStateArgs);
}
