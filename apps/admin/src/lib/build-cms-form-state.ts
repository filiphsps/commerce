import 'server-only';

import { isHiddenEditorField } from '@nordcom/commerce-cms/editor';
import { buildFormState } from '@payloadcms/ui/utilities/buildFormState';
import type { BuildFormStateArgs, FlattenedField, FormState, PayloadRequest } from 'payload';
import { getFieldByPath } from 'payload';

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
 * default RSC-rendering behavior automatically.
 */
export type BuildCmsFormStateArgs = Omit<BuildFormStateArgs, 'mockRSCs' | 'renderAllFields'>;

export async function buildCmsFormState(args: BuildCmsFormStateArgs) {
    const result = await buildFormState({
        ...args,
        renderAllFields: false,
        mockRSCs: true,
    } as BuildFormStateArgs);

    if ('collectionSlug' in args && typeof args.collectionSlug === 'string') {
        stripHiddenFieldState(args.collectionSlug, args.req, result.state);
        logUnsupportedMocks(args.collectionSlug, args.req, result.state);
    }

    return result;
}

/**
 * Resolve the server-side flattened field list Payload attached to the
 * authed request. Returns `undefined` when the collection isn't registered
 * — `logUnsupportedMocks` already tolerates that path by falling back to
 * `type=unknown` in its warning string, and `stripHiddenFieldState` no-ops.
 *
 * @param collectionSlug - Slug of the collection whose form state was built.
 * @param req - Authed Payload request carrying the sanitized config tree.
 * @returns The flattened field list, or `undefined` when unavailable.
 */
function getFlattenedFields(collectionSlug: string, req: PayloadRequest): FlattenedField[] | undefined {
    const collections = req?.payload?.collections as
        | Record<string, { config?: { flattenedFields?: FlattenedField[] } }>
        | undefined;
    return collections?.[collectionSlug]?.config?.flattenedFields;
}

/**
 * Delete every form-state entry whose schema field `isHiddenEditorField`
 * flags. Runs before `logUnsupportedMocks` so warnings for hidden fields
 * never fire, and runs against the same paths `<EditorFields>` filters on
 * the client so the state shape stays consistent across both layers.
 *
 * @param collectionSlug - Slug of the collection whose form state was built.
 * @param req - Authed Payload request — used to resolve the field config.
 * @param state - The form state returned by `buildFormState`; mutated in place.
 */
function stripHiddenFieldState(collectionSlug: string, req: PayloadRequest, state: FormState): void {
    const flattenedFields = getFlattenedFields(collectionSlug, req);
    if (!flattenedFields) return;

    for (const path of Object.keys(state)) {
        const schemaPath = stripRowIndices(path);
        const field = getFieldByPath({ fields: flattenedFields, path: schemaPath })?.field;
        if (isHiddenEditorField(field)) {
            delete state[path];
        }
    }
}

/**
 * Component slots Payload replaces with the literal string `'Mock'` when
 * `mockRSCs: true` and a field declares a server-side renderer. Mirrors
 * `defaultUIFieldComponentKeys` in `@payloadcms/ui` plus the trailing
 * `AfterInput`/`BeforeInput`/etc. slots, and the `RowLabel` row hook
 * arrays/blocks attach to their `rows[].customComponents`.
 */
const MOCK_PLACEHOLDER = 'Mock';

export type MockedFieldSlot = {
    /** Schema path with row indices stripped, e.g. `hero.title` (not `hero.0.title`). */
    path: string;
    /** Component slot that rendered the placeholder. `RowLabel` for array/blocks row headers. */
    slot: string;
};

/**
 * Walk a `FormState` and collect every `customComponents` entry Payload
 * replaced with the placeholder string `'Mock'`. Sorted for stable assertions.
 *
 * @param state - The form state returned by `buildFormState`.
 * @returns A list of `{ path, slot }` entries — empty when nothing was mocked.
 */
export function scanFormStateForMocks(state: FormState): MockedFieldSlot[] {
    const found: MockedFieldSlot[] = [];

    for (const [path, fieldState] of Object.entries(state)) {
        if (!fieldState) continue;
        const schemaPath = stripRowIndices(path);

        const components = fieldState.customComponents;
        if (components) {
            for (const [slot, value] of Object.entries(components)) {
                if (value === MOCK_PLACEHOLDER) {
                    found.push({ path: schemaPath, slot });
                }
            }
        }

        if (Array.isArray(fieldState.rows)) {
            for (const row of fieldState.rows) {
                if (row?.customComponents?.RowLabel === MOCK_PLACEHOLDER) {
                    found.push({ path: schemaPath, slot: 'RowLabel' });
                    break;
                }
            }
        }
    }

    return dedupeMocks(found);
}

/**
 * Form-state paths embed row positions (`hero.0.title`); the collection
 * config and `getFieldByPath` work on schema paths (`hero.title`). Drop
 * any all-digit segment to bridge the two.
 *
 * @param path - Form-state path, possibly containing row indices.
 * @returns Schema path with row indices removed.
 */
function stripRowIndices(path: string): string {
    return path
        .split('.')
        .filter((segment) => !/^\d+$/.test(segment))
        .join('.');
}

function dedupeMocks(entries: MockedFieldSlot[]): MockedFieldSlot[] {
    const seen = new Set<string>();
    const out: MockedFieldSlot[] = [];
    for (const entry of entries) {
        const key = `${entry.path}::${entry.slot}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(entry);
    }
    return out.sort((a, b) => a.path.localeCompare(b.path) || a.slot.localeCompare(b.slot));
}

/**
 * Process-scoped dedupe so each `(collectionSlug, path, slot)` triple
 * logs exactly once per server lifetime. `buildFormState` runs on every
 * field interaction; without this we'd reprint the same warnings on
 * every keystroke.
 */
const loggedMocks = new Set<string>();

/**
 * Emit a `console.warn` for every (collection, field, slot) triple Payload
 * rendered as the placeholder string `'Mock'` because `mockRSCs: true` is
 * pinned in this wrapper. Lets us track which field types still need a
 * client-side renderer (or a custom Field component registered via the
 * Payload importMap) without crashing the editor at runtime.
 *
 * @param collectionSlug - Slug of the collection whose form state was built.
 * @param req - Authed Payload request — used to resolve the field config so we can include its `type` in the log.
 * @param state - The form state returned by `buildFormState`.
 */
function logUnsupportedMocks(collectionSlug: string, req: PayloadRequest, state: FormState): void {
    const flattenedFields = getFlattenedFields(collectionSlug, req);

    for (const { path, slot } of scanFormStateForMocks(state)) {
        const key = `${collectionSlug}::${path}::${slot}`;
        if (loggedMocks.has(key)) continue;
        loggedMocks.add(key);

        const fieldType = flattenedFields
            ? (getFieldByPath({ fields: flattenedFields, path })?.field.type ?? 'unknown')
            : 'unknown';

        console.warn(
            `[cms/editor] field component rendered as '${MOCK_PLACEHOLDER}' placeholder — ` +
                `collection=${collectionSlug} path=${path} type=${fieldType} slot=${slot}. ` +
                `Add a client-side renderer or register the RSC implementation in Payload's importMap.`,
        );
    }
}

/**
 * Test-only: clears the process-scoped dedupe set. Production code must
 * never call this — re-emitting per-process noise is the point of the set.
 *
 * @internal
 */
export function __resetLoggedMocksForTests(): void {
    loggedMocks.clear();
}
