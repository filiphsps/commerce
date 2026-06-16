// @vitest-environment happy-dom
/**
 * CMSGATE-01 — G4 parity gate, half 1: the form engine proven end to end on the
 * header tenant-singleton (depth-6 nav).
 *
 * The stack under test is REAL at every layer the engine owns:
 * - the real `EditorEditPage` server component (locale narrowing, bridge read,
 *   form-state build, bound actions),
 * - the real native `<Form>` + `<EditorFields>` widget registry (depth-6 array
 *   recursion, variant select, localized leaves),
 * - the real `EditorFormToolbar` 2s interval autosave,
 * - the real `createCollectionEditorActions` route gates + `parseFormPayload`,
 * - the real `editor-convex-bridge` module (arg mapping, per-call client), and
 * - the REAL Convex `cms/actions|documents|versions` mutations running in
 *   `convex-test` under the deployed schema with act-as identities.
 *
 * Only the WIRE is substituted: the `@nordcom/commerce-db` identity-client
 * transport routes into the convex-test harness (`withIdentity`) instead of a
 * `ConvexHttpClient`, and the NextAuth token mint is stubbed — both are
 * network/session seams, not engine logic. Presentational admin chrome that
 * drags Nordstar CSS modules (toolbar buttons, table) is stubbed FUNCTIONALLY
 * (the buttons still invoke the real bound actions).
 */

import { createCollectionEditorActions } from '@nordcom/commerce-cms/editor';
import { headerEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorEditPage } from '@nordcom/commerce-cms/editor/ui';
import { createUnitConvex } from '@nordcom/commerce-test-convex/unit';
import { ConvexError } from 'convex/values';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { act, fireEvent, render } from '@/utils/test/react';

import schema from '../../../../packages/convex/convex/schema';

/** Identity + transport holder the hoisted module mocks read through. */
const h = vi.hoisted(() => ({
    harness: null as unknown,
    identity: null as { issuer: string; subject: string; email: string } | null,
    /** When set, every bridge mutation awaits this gate first — the in-flight interleaving lever. */
    gate: null as Promise<void> | null,
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
    notFound: () => {
        throw new Error('NEXT_NOT_FOUND');
    },
    redirect: (url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    },
    useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
    usePathname: () => '/gate-shop.example.com/content/header/',
    useSearchParams: () => new URLSearchParams('locale=en-US'),
    useParams: () => ({ domain: 'gate-shop.example.com' }),
}));
vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={String(href)} {...rest}>
            {children}
        </a>
    ),
}));

// Nordstar-CSS chrome: stubbed FUNCTIONALLY — the toolbar buttons still invoke
// the real bound save/publish actions the engine wires through them.
vi.mock('@/components/cms/draft-publish-toolbar', () => ({
    DraftPublishToolbar: (props: {
        saveDraftAction: () => Promise<void>;
        publishAction: () => Promise<void>;
        isSaving: boolean;
    }) => (
        <div>
            <button data-testid="save-draft" type="button" onClick={() => void props.saveDraftAction()}>
                Save draft
            </button>
            <button data-testid="publish" type="button" onClick={() => void props.publishAction()}>
                Publish
            </button>
            <output data-testid="is-saving">{String(props.isSaving)}</output>
        </div>
    ),
}));
vi.mock('@/components/cms/collection-table', () => ({ CollectionTable: vi.fn() }));
vi.mock('@/components/shell/empty-state', () => ({ EmptyState: vi.fn() }));

// Session/Payload seams the runtime touches but this gate replaces with act-as
// context (the authoritative enforcement is the Convex side, driven for real).
vi.mock('./cms-ctx', () => ({ getAuthedCmsCtx: vi.fn() }));
vi.mock('./clerk-convex-token', () => ({ getAuthenticatedConvexClient: vi.fn(async () => ({ setAuth: () => {} })) }));

// The identity-client transport — the ONLY substituted layer between the real
// bridge module and the real Convex functions: route each call into the
// convex-test harness under the current act-as identity.
vi.mock('@nordcom/commerce-db', async () => {
    const { makeFunctionReference } = await import('convex/server');
    type Caller = {
        withIdentity: (identity: object) => {
            query: (ref: unknown, args: Record<string, unknown>) => Promise<unknown>;
            mutation: (ref: unknown, args: Record<string, unknown>) => Promise<unknown>;
        };
    };
    const caller = () => {
        if (!h.harness || !h.identity) throw new TypeError('convex-test harness not initialized');
        return (h.harness as Caller).withIdentity(h.identity);
    };
    return {
        createConvexIdentityClient: () => ({ setAuth: () => {} }),
        convexIdentityQuery: async (_client: unknown, name: string, args: Record<string, unknown>) =>
            caller().query(makeFunctionReference<'query'>(name), args),
        convexIdentityMutation: async (_client: unknown, name: string, args: Record<string, unknown>) => {
            if (h.gate) await h.gate;
            return caller().mutation(makeFunctionReference<'mutation'>(name), args);
        },
    };
});

import { revalidatePath } from 'next/cache';
import { getAuthedCmsCtx } from './cms-ctx';
import { editorConvexBridge } from './editor-convex-bridge';
import { editorRuntime } from './editor-runtime';

const TRUSTED_ISSUER = 'https://admin.gate.nordcom.io';
const OPERATOR_EMAIL = 'gate-operator@example.com';
const OUTSIDER_EMAIL = 'gate-outsider@example.com';
const DOMAIN = 'gate-shop.example.com';
const NOW = 1_700_000_000_000;

/** The deployed Convex cms modules convex-test resolves the bridge's function names against. */
const modules = {
    '/convex/cms/actions.ts': () => import('../../../../packages/convex/convex/cms/actions'),
    '/convex/cms/documents.ts': () => import('../../../../packages/convex/convex/cms/documents'),
    '/convex/cms/versions.ts': () => import('../../../../packages/convex/convex/cms/versions'),
    // The edit page prefetches link-relationship options through the bounded
    // list read since CMSGATE-02 (the header nav's linkFields target pages/
    // articles/product/collection metadata).
    '/convex/cms/list.ts': () => import('../../../../packages/convex/convex/cms/list'),
};

type SeededTenant = { shopId: string };

/**
 * Builds a fresh harness and seeds one tenant: the operator (admin collaborator),
 * an outsider platform user with NO collaborator row, and the `shops` row.
 *
 * @returns The seeded shop id (as a string for ctx wiring).
 */
async function seedTenant(): Promise<SeededTenant> {
    const t = createUnitConvex(schema, modules);
    h.harness = t;
    // Pre-warm the function modules: convex-test imports them lazily on first
    // call, and a COLD dynamic import needs a real event-loop turn — which a
    // chain started inside `vi.advanceTimersByTimeAsync` (the 2s autosave tick)
    // never gets under frozen fake timers. Warming the cache here keeps the
    // in-tick mutation chain pure-microtask, exactly like a deployed call.
    await Promise.all(Object.values(modules).map((load) => load()));
    const shopId = await t.run(async (ctx) => {
        const operator = await ctx.db.insert('users', {
            email: OPERATOR_EMAIL,
            name: 'Gate Operator',
            emailVerified: null,
            identities: [],
            createdAt: NOW,
            updatedAt: NOW,
        });
        await ctx.db.insert('users', {
            email: OUTSIDER_EMAIL,
            name: 'Gate Outsider',
            emailVerified: null,
            identities: [],
            createdAt: NOW,
            updatedAt: NOW,
        });
        const shop = await ctx.db.insert('shops', {
            legacyId: 'gate_shop',
            name: 'Gate Shop',
            domain: DOMAIN,
            i18n: { defaultLocale: 'en-US' },
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'Gate' } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: NOW,
            updatedAt: NOW,
        });
        await ctx.db.insert('shopCollaborators', { shop, user: operator, permissions: ['admin'] });
        return shop;
    });
    return { shopId: String(shopId) };
}

/**
 * Points the act-as seams (route ctx + convex identity) at the operator.
 *
 * @param shopId - The seeded tenant's shop id.
 */
function actAsOperator(shopId: string): void {
    h.identity = { issuer: TRUSTED_ISSUER, subject: 'github|gate-operator', email: OPERATOR_EMAIL };
    vi.mocked(getAuthedCmsCtx).mockResolvedValue({
        user: {
            id: 'user_operator',
            email: OPERATOR_EMAIL,
            role: 'admin',
            tenants: [{ tenant: shopId }],
            collection: 'users',
        },
        tenant: {
            id: shopId,
            slug: 'gate_shop',
            name: 'Gate Shop',
            defaultLocale: 'en-US',
            locales: ['en-US', 'de-DE'],
        },
    } as never);
}

/**
 * Renders the REAL header edit page for the given locale through the real
 * runtime and the factory-built (codegen-equivalent) actions.
 *
 * @param locale - The `?locale=` the page resolves.
 * @returns The testing-library render result.
 */
async function renderHeaderEditor(locale: string) {
    const actions = createCollectionEditorActions(headerEditor, editorRuntime);
    const ui = await EditorEditPage({
        manifest: headerEditor,
        runtime: editorRuntime,
        params: { domain: DOMAIN, id: '' },
        searchParams: { locale },
        generatedActions: actions,
    });
    return render(ui as ReactElement);
}

/**
 * The dotted form-state path of the nav node at nesting `level` (1-based):
 * `items.0`, `items.0.items.0`, … — the index-0 spine the flow tests build.
 *
 * @param level - Nav depth, 1 through 6.
 * @returns The node's dotted path.
 */
function navPath(level: number): string {
    return Array.from({ length: level }, () => 'items.0').join('.');
}

/**
 * Reads the tenant's single header `cmsDocuments` row straight off the raw db.
 *
 * @returns The row, or `undefined` when none exists.
 */
async function headerRow() {
    type Row = { _id: string; collection: string; data: Record<string, unknown>; status: string };
    const t = h.harness as {
        run: (
            fn: (ctx: { db: { query: (t: string) => { collect: () => Promise<Row[]> } } }) => Promise<Row[]>,
        ) => Promise<Row[]>;
    };
    const rows = await t.run(async (ctx) => ctx.db.query('cmsDocuments').collect());
    return rows.find((row) => row.collection === 'header');
}

/**
 * Collects the `_scheduled_functions` rows the harness has recorded — the
 * post-commit work a mutation armed. Frozen timers keep every row PENDING, so
 * the gate asserts WHAT was scheduled without ever executing it.
 *
 * @returns The scheduled-function system rows.
 */
async function scheduledFunctions(): Promise<unknown[]> {
    type SystemCtx = { db: { system: { query: (table: string) => { collect: () => Promise<unknown[]> } } } };
    const t = h.harness as { run: (fn: (ctx: SystemCtx) => Promise<unknown[]>) => Promise<unknown[]> };
    return t.run(async (ctx) => ctx.db.system.query('_scheduled_functions').collect());
}

/**
 * Walks a header `data.items` spine down `level` nodes along index 0.
 *
 * @param data - The header document data.
 * @param level - Nav depth, 1-based.
 * @returns The node at that depth.
 */
function navNodeAt(data: Record<string, unknown>, level: number): Record<string, unknown> {
    let node = (data.items as Array<Record<string, unknown>>)[0];
    for (let i = 1; i < level; i++) {
        node = (node?.items as Array<Record<string, unknown>>)[0];
    }
    if (!node) throw new TypeError(`no nav node at level ${level}`);
    return node;
}

/** Asserts a control exists inside the field shell at `path` and returns it. */
function controlAt(container: HTMLElement, path: string, selector: string): HTMLElement {
    const shell = container.querySelector(`[data-testid="field-${path}"]`);
    if (!shell) throw new TypeError(`no field shell rendered for \`${path}\``);
    const control = shell.querySelector(selector);
    if (!control) throw new TypeError(`no \`${selector}\` control in \`${path}\` shell`);
    return control as HTMLElement;
}

beforeEach(() => {
    vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
    // Frozen timers keep publish's `runAfter(0)` revalidation schedule PENDING
    // (`revalidate/onPublish` is deliberately absent from the module map — the
    // gate asserts WHAT was armed, never runs it) and drive the 2s autosave.
    vi.useFakeTimers({ now: NOW });
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    h.harness = null;
    h.identity = null;
    h.gate = null;
});

describe('CMSGATE-01 — header editor end to end (real engine, real Convex functions)', () => {
    it('creates the singleton, edits a depth-6 nav item, autosaves on the 2s clock, publishes, and restores v1', async () => {
        const { shopId } = await seedTenant();
        actAsOperator(shopId);

        // ── CREATE: no document exists; the page renders the create form. ──
        const { container } = await renderHeaderEditor('en-US');
        expect(await headerRow()).toBeUndefined();

        // Build the depth-6 spine through the REAL array widgets: one add-click
        // per level, then type into each level's leaves.
        await act(async () => {
            fireEvent.click(container.querySelector('[data-testid="array-add-items"]') as HTMLElement);
        });
        for (let level = 2; level <= 6; level++) {
            const addPath = `${navPath(level - 1)}.items`;
            await act(async () => {
                fireEvent.click(container.querySelector(`[data-testid="array-add-${addPath}"]`) as HTMLElement);
            });
        }

        // Every level of the depth-6 tree mounts with EDITABLE leaves.
        for (let level = 1; level <= 6; level++) {
            const path = navPath(level);
            expect(controlAt(container, `${path}.description`, 'textarea')).toBeTruthy();
            expect(controlAt(container, `${path}.backgroundColor`, 'input')).toBeTruthy();
            await act(async () => {
                fireEvent.change(controlAt(container, `${path}.backgroundColor`, 'input'), {
                    target: { value: `#level${level}` },
                });
            });
        }
        // The per-item variant select exists ONLY at the top level.
        const variantSelect = controlAt(container, 'items.0.variant', 'select') as HTMLSelectElement;
        expect(container.querySelector(`[data-testid="field-${navPath(2)}.variant"]`)).toBeNull();
        await act(async () => {
            fireEvent.change(variantSelect, { target: { value: 'compact-list' } });
        });
        // The depth-6 leaf gets editorial copy (a LOCALIZED textarea — the edit
        // lands in the active en-US bucket slot).
        await act(async () => {
            fireEvent.change(controlAt(container, `${navPath(6)}.description`, 'textarea'), {
                target: { value: 'Level-six leaf copy' },
            });
        });

        // ── 2s AUTOSAVE: the singleton upsert creates the live draft row. ──
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        const created = await headerRow();
        expect(created?.status).toBe('draft');
        expect(navNodeAt(created?.data ?? {}, 6).description).toEqual({ 'en-US': 'Level-six leaf copy' });
        expect(navNodeAt(created?.data ?? {}, 1).variant).toBe('compact-list');
        expect(navNodeAt(created?.data ?? {}, 3).backgroundColor).toBe('#level3');
        // The draft path schedules ZERO revalidation work and refreshes no paths.
        expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
        expect(await scheduledFunctions()).toHaveLength(0);

        // A second tick with no edits must not append another version.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        const versionsAfterIdle = await editorConvexBridge.listVersions({ documentId: String(created?._id) });
        expect(versionsAfterIdle).toHaveLength(1);

        // ── PUBLISH (v2): the toolbar's real publish action. ──
        await act(async () => {
            fireEvent.click(container.querySelector('[data-testid="publish"]') as HTMLElement);
            await vi.advanceTimersByTimeAsync(0);
        });
        const published = await headerRow();
        expect(published?.status).toBe('published');
        const versionsAfterPublish = await editorConvexBridge.listVersions({ documentId: String(created?._id) });
        expect(versionsAfterPublish).toHaveLength(2);
        expect(versionsAfterPublish[1]?.status).toBe('published');
        // The publish transition — and ONLY it — armed the post-commit
        // revalidation hook (kept pending by the frozen timers).
        expect(await scheduledFunctions()).toHaveLength(1);

        // ── EDIT AGAIN (v3, explicit draft save), then RESTORE the published v2. ──
        await act(async () => {
            fireEvent.change(controlAt(container, `${navPath(6)}.description`, 'textarea'), {
                target: { value: 'Overwritten copy' },
            });
        });
        await act(async () => {
            fireEvent.click(container.querySelector('[data-testid="save-draft"]') as HTMLElement);
            await vi.advanceTimersByTimeAsync(0);
        });
        const overwritten = await headerRow();
        expect(navNodeAt(overwritten?.data ?? {}, 6).description).toEqual({ 'en-US': 'Overwritten copy' });

        const actions = createCollectionEditorActions(headerEditor, editorRuntime);
        const versionId = versionsAfterPublish[1]?.versionId;
        if (!versionId) throw new TypeError('published version missing');
        await actions.restoreVersion(DOMAIN, '', versionId);

        const restored = await headerRow();
        // Restore re-materializes the snapshot as a NEW draft into the working data; the
        // published state stays pinned (a restore never unpublishes — G4FIX-01) and the depth-6
        // tree and the localized bucket round-trip byte-for-byte.
        expect(restored?.status).toBe('published');
        expect(navNodeAt(restored?.data ?? {}, 6).description).toEqual({ 'en-US': 'Level-six leaf copy' });
        expect(navNodeAt(restored?.data ?? {}, 1).variant).toBe('compact-list');
        expect(restored?.data).toEqual(published?.data);
        const versionsAfterRestore = await editorConvexBridge.listVersions({ documentId: String(created?._id) });
        expect(versionsAfterRestore).toHaveLength(4);
        // Real Convex create→edit→autosave→publish→restore round trips run ~2.6s isolated;
        // under the full suite's parallel CPU contention the default 5s ceiling starves them.
        // A generous timeout keeps the real-engine pass robust without masking a genuine hang.
    }, 30_000);

    it('never clobbers a keystroke typed while an autosave is in flight (full-stack interleaving)', async () => {
        const { shopId } = await seedTenant();
        actAsOperator(shopId);

        const { container } = await renderHeaderEditor('en-US');

        // Edit field B (logoLink), then hold its autosave in flight.
        await act(async () => {
            fireEvent.change(controlAt(container, 'logoLink', 'input'), { target: { value: '/home/' } });
        });
        let release: (() => void) | undefined;
        h.gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });

        // While the save is in flight, the user types into field A.
        await act(async () => {
            fireEvent.change(controlAt(container, 'localeSwitcher.label', 'input'), { target: { value: 'Region' } });
        });

        // Release the wire; the held save lands with B's value.
        h.gate = null;
        await act(async () => {
            release?.();
            await vi.advanceTimersByTimeAsync(0);
        });
        const afterFirst = await headerRow();
        expect(afterFirst?.data.logoLink).toBe('/home/');

        // A's keystroke SURVIVED the round-trip in form state and posts next tick.
        expect((controlAt(container, 'localeSwitcher.label', 'input') as HTMLInputElement).value).toBe('Region');
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        const afterSecond = await headerRow();
        expect((afterSecond?.data.localeSwitcher as Record<string, unknown>).label).toEqual({ 'en-US': 'Region' });
        expect(afterSecond?.data.logoLink).toBe('/home/');
    });

    it('edits a localized child in locale B without disturbing locale A, narrowed to the tenant locales', async () => {
        const { shopId } = await seedTenant();
        actAsOperator(shopId);

        // Seed the singleton through the REAL saveDraft mutation with locale-A
        // content: a bucketed switcher label and a depth-2 localized description.
        const t = h.harness as {
            withIdentity: (i: object) => {
                mutation: (ref: unknown, args: Record<string, unknown>) => Promise<unknown>;
            };
        };
        const { makeFunctionReference } = await import('convex/server');
        await t
            .withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|gate-operator', email: OPERATOR_EMAIL })
            .mutation(makeFunctionReference<'mutation'>('cms/actions:saveDraft'), {
                collection: 'header',
                data: {
                    logoLink: '/',
                    items: [
                        {
                            link: { kind: 'external', label: 'Shop', url: '/shop/' },
                            items: [{ description: { 'en-US': 'English copy' } }],
                        },
                    ],
                    localeSwitcher: { enabled: true, label: { 'en-US': 'Region' } },
                },
            });

        // A locale OUTSIDE the tenant allow-list redirects to the tenant default
        // (the per-tenant narrowing seam).
        await expect(renderHeaderEditor('fr-FR')).rejects.toThrow(/NEXT_REDIRECT:.*locale=en-US/);

        // Locale B (allowed): the localized leaves show locale B's OWN slots (empty).
        const { container } = await renderHeaderEditor('de-DE');
        const label = controlAt(container, 'localeSwitcher.label', 'input') as HTMLInputElement;
        expect(label.value).toBe('');
        const description = controlAt(container, 'items.0.items.0.description', 'textarea') as HTMLTextAreaElement;
        expect(description.value).toBe('');
        // The nav link's LABEL is a localized leaf since G4FIX-03 — locale B's
        // slot starts empty even though locale A holds 'Shop'.
        const navLabel = controlAt(container, 'items.0.link.label', 'input') as HTMLInputElement;
        expect(navLabel.value).toBe('');

        await act(async () => {
            fireEvent.change(label, { target: { value: 'Standort' } });
            fireEvent.change(description, { target: { value: 'Deutscher Text' } });
            fireEvent.change(navLabel, { target: { value: 'Laden' } });
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });

        const row = await headerRow();
        const switcher = row?.data.localeSwitcher as Record<string, unknown>;
        // Locale A's slots are byte-for-byte intact; locale B landed beside them.
        expect(switcher.label).toEqual({ 'en-US': 'Region', 'de-DE': 'Standort' });
        const child = navNodeAt(row?.data ?? {}, 2);
        expect(child.description).toEqual({ 'en-US': 'English copy', 'de-DE': 'Deutscher Text' });
        // The canonical localized-group case (G4FIX-03): the nav label carries
        // one slot per locale while the destination stays a single shared
        // value — editing locale B never disturbed locale A's label.
        const link = navNodeAt(row?.data ?? {}, 1).link as Record<string, unknown>;
        expect(link.label).toEqual({ 'en-US': 'Shop', 'de-DE': 'Laden' });
        expect(link.kind).toBe('external');
        expect(link.url).toBe('/shop/');
    });

    it('denies a non-member at the route gate AND at the authoritative Convex layer', async () => {
        const { shopId } = await seedTenant();

        // Route layer: an editor with no tenant membership fails the manifest's
        // `tenantMember` read gate and the page 404s.
        h.identity = { issuer: TRUSTED_ISSUER, subject: 'github|gate-outsider', email: OUTSIDER_EMAIL };
        vi.mocked(getAuthedCmsCtx).mockResolvedValue({
            user: {
                id: 'user_outsider',
                email: OUTSIDER_EMAIL,
                role: 'editor',
                tenants: [],
                collection: 'users',
            },
            tenant: { id: shopId, slug: 'gate_shop', defaultLocale: 'en-US', locales: ['en-US'] },
        } as never);
        await expect(renderHeaderEditor('en-US')).rejects.toThrow('NEXT_NOT_FOUND');

        // Authoritative layer: the same identity through the REAL bridge module
        // is rejected by the Convex tenant resolver — no collaborator row, no shop.
        const denied = await editorConvexBridge
            .saveDraft({ collection: 'header', data: { logoLink: '/pwned/' }, locale: 'en-US' })
            .then(
                () => {
                    throw new TypeError('expected the non-member save to reject');
                },
                (cause: unknown) => cause,
            );
        expect(denied).toBeInstanceOf(ConvexError);
        expect((denied as ConvexError<{ code: string }>).data.code).toBe('NO_SHOP_MEMBERSHIP');
        expect(await headerRow()).toBeUndefined();
    });
});
