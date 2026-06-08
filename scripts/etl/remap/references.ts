import { coerceObjectId, type Doc, remapObjectId } from '../transform/id-remap';
import type { ConvexImportDataset, TransformedDoc } from '../transform/index';
import { normalizeExtendedJson } from '../transform/index';

/**
 * One resolved foreign-key edge in the staged Convex dataset: the `field` on row `fromId` in
 * `fromTable` points at the row `toId` in `toTable`. Every value is a deterministic surrogate Convex
 * id (the linking key the import reconciles to the deployment-issued `_id`), so a reference is
 * checkable for danglement without a live deployment.
 */
export interface Reference {
    fromTable: string;
    fromId: string;
    field: string;
    toTable: string;
    toId: string;
}

/**
 * Descriptor of one foreign-key edge in the Convex reference graph: the `field` on a row of `table`
 * references a row in `target`. This catalog is the single source of truth for which document fields
 * are id references and where they point — `collectReferences` walks it so a new reference is covered
 * by adding one entry here, not by editing the collection logic.
 */
export interface ReferenceEdge {
    table: string;
    field: string;
    target: string;
}

/**
 * Every INTERNAL id reference the migrated dataset must keep consistent. These are the `v.id(...)`
 * foreign keys the committed `tables/` validators declare, plus the `sessions.user` link the
 * auth-family transform remaps. The public, externally-persisted `shop.id` (== `legacyId`) is NOT an
 * internal surrogate edge and is verified separately (see `./external-refs`). Carts/analytics carry
 * no source collection in the Phase-0 unified schema (`packages/db/src/models` has only
 * shop/feature-flag/identity/review/session/user), so they contribute no edge here; the per-edge
 * catalog is the extension point that adds them the moment such a collection joins the export.
 */
export const REFERENCE_EDGES: readonly ReferenceEdge[] = [
    { table: 'shopCredentials', field: 'shop', target: 'shops' },
    { table: 'shopDomains', field: 'shop', target: 'shops' },
    { table: 'shopCollaborators', field: 'shop', target: 'shops' },
    { table: 'shopCollaborators', field: 'user', target: 'users' },
    { table: 'shopFeatureFlags', field: 'shop', target: 'shops' },
    { table: 'shopFeatureFlags', field: 'flag', target: 'featureFlags' },
    { table: 'reviews', field: 'shopId', target: 'shops' },
    { table: 'sessions', field: 'user', target: 'users' },
];

/**
 * Remaps one raw mongoexport `sessions` document into its staged Convex row, rewriting the
 * `sessions.user` ObjectId reference to the deterministic surrogate `v.id('users')` via the SAME
 * derivation the shop transform uses for `shopCollaborators.user` — so a session and a collaborator
 * pointing at the same source user resolve to one identical live `users` row. Returns `null` when the
 * row has no resolvable `_id` or `user`, so an unresolvable session is skipped rather than throwing
 * (the proven PIPELINE-01 null-return convention). Pure — never mutates `raw`.
 *
 * @param raw - A source `sessions` document in mongoexport extended JSON.
 * @returns The staged session row keyed by its surrogate `payloadId`, or `null` when unresolvable.
 */
export const remapSession = (raw: Doc): TransformedDoc | null => {
    const doc = normalizeExtendedJson(raw) as Doc;
    const legacyId = coerceObjectId(doc._id);
    if (!legacyId) return null;
    const userHex = coerceObjectId(doc.user);
    if (!userHex) return null;
    const document: Doc = { user: remapObjectId('users', userHex) };
    if (typeof doc.token === 'string') document.token = doc.token;
    if (typeof doc.expiresAt === 'number') document.expiresAt = doc.expiresAt;
    if (typeof doc.createdAt === 'number') document.createdAt = doc.createdAt;
    if (typeof doc.updatedAt === 'number') document.updatedAt = doc.updatedAt;
    return { payloadId: remapObjectId('sessions', legacyId), document };
};

/**
 * The set of live target-row surrogate ids per table, keyed by table name. A reference resolves iff
 * its `toId` is a member of `liveIds[toTable]`; an absent table key means that target was not loaded
 * into this graph and so its edges are out of scope (see {@link buildReferenceGraph}).
 */
export type LiveIdRegistry = Record<string, ReadonlySet<string>>;

/** The full internal reference graph: the resolved edges plus the live-id registry they resolve against. */
export interface ReferenceGraph {
    references: Reference[];
    liveIds: LiveIdRegistry;
}

/** Raw auth-family source documents the main shop transform does not stage, supplied to complete the graph. */
export interface AuthFamilySource {
    users?: Doc[];
    sessions?: Doc[];
}

/**
 * Reads the surrogate `payloadId` of every row in a staged table into a set of live target ids. Pure.
 *
 * @param rows - The staged rows of one table.
 * @returns The set of their surrogate ids.
 */
const liveIdsOf = (rows: readonly TransformedDoc[]): Set<string> => new Set(rows.map((row) => row.payloadId));

/**
 * Reads the surrogate `users` id of every raw user document into a set of live user ids, applying the
 * same `remapObjectId('users', …)` derivation the collaborator/session references use so the sets
 * align. Skips a user with no resolvable `_id`. Pure.
 *
 * @param users - Raw `users` documents in mongoexport extended JSON.
 * @returns The set of live surrogate user ids.
 */
const liveUserIds = (users: readonly Doc[]): Set<string> => {
    const ids = new Set<string>();
    for (const raw of users) {
        const hex = coerceObjectId((normalizeExtendedJson(raw) as Doc)._id);
        if (hex) ids.add(remapObjectId('users', hex));
    }
    return ids;
};

/**
 * Walks the reference-bearing rows of `tables` and collects one {@link Reference} per declared edge
 * whose `target` table is present in `registry`. Edges to a target absent from the registry are NOT
 * collected: that target was not loaded into this graph, so its references are out of scope rather
 * than spuriously dangling — keeping every collected reference genuinely resolvable. A reference field
 * that is absent or not a string is skipped (an unresolved ref carries no surrogate to link). Pure.
 *
 * @param tables - Staged rows keyed by table name (the shop dataset plus the remapped auth family).
 * @param registry - The live-id registry whose keys define which target tables are in scope.
 * @returns Every in-scope, resolvable-target reference found, in `REFERENCE_EDGES` then row order.
 */
export const collectReferences = (
    tables: Readonly<Record<string, readonly TransformedDoc[]>>,
    registry: LiveIdRegistry,
): Reference[] => {
    const references: Reference[] = [];
    for (const edge of REFERENCE_EDGES) {
        if (!(edge.target in registry)) continue;
        const rows = tables[edge.table];
        if (!rows) continue;
        for (const row of rows) {
            const toId = row.document[edge.field];
            if (typeof toId !== 'string') continue;
            references.push({
                fromTable: edge.table,
                fromId: row.payloadId,
                field: edge.field,
                toTable: edge.target,
                toId,
            });
        }
    }
    return references;
};

/**
 * Builds the complete internal {@link ReferenceGraph} from the staged shop dataset plus the optional
 * raw auth family. The registry holds the live ids of every reference TARGET it can resolve: `shops`
 * and `featureFlags` always (both staged by the transform), and `users` only when raw users are
 * supplied. Sessions are remapped here (their `user` edge) and merged into the row set; the shop
 * transform already staged the collaborator/feature-flag/review/credential/domain edges. The graph is
 * internally consistent: every collected reference targets a table whose live ids are known, so a
 * later dangling result means a genuinely missing row — never an unloaded table.
 *
 * @param dataset - The staged Convex import dataset from `../transform`.
 * @param auth - Raw `users`/`sessions` documents the main transform does not stage.
 * @returns The reference graph: resolved edges plus the live-id registry.
 */
export const buildReferenceGraph = (dataset: ConvexImportDataset, auth: AuthFamilySource = {}): ReferenceGraph => {
    const sessions: TransformedDoc[] = [];
    for (const raw of auth.sessions ?? []) {
        const row = remapSession(raw);
        if (row) sessions.push(row);
    }

    const registry: LiveIdRegistry = {
        shops: liveIdsOf(dataset.shops),
        featureFlags: liveIdsOf(dataset.featureFlags),
    };
    if (auth.users) registry.users = liveUserIds(auth.users);

    const tables: Record<string, readonly TransformedDoc[]> = {
        shopCredentials: dataset.shopCredentials,
        shopDomains: dataset.shopDomains,
        shopCollaborators: dataset.shopCollaborators,
        shopFeatureFlags: dataset.shopFeatureFlags,
        reviews: dataset.reviews,
        sessions,
    };

    return { references: collectReferences(tables, registry), liveIds: registry };
};
