// @vitest-environment happy-dom
/**
 * CMSGATE-02 — G4 parity gate, half 2: the form engine proven end to end on
 * `pages` — all nine blocks (including a columns-nested ProseMirror rich-text
 * block), the REAL media upload transport (byte sink → finalize → the
 * Node-side sharp pass → saveDerivatives, all four frozen sizes + focal), the
 * live relationship option transport, the 2s autosave, draft-skips-required vs
 * publish-enforces validation, version restore, access enforcement, and the
 * frozen storefront read contract (`cms/read:pageBySlug`).
 *
 * The stack under test is REAL at every layer the engine owns:
 * - the real `EditorNewPage`/`EditorEditPage` server components (locale
 *   narrowing, bridge reads, relationship-option prefetch, bound actions),
 * - the real native `<Form>` + `<EditorFields>` widget registry (blocks
 *   recursion, nested columns content, upload + relationship transports),
 * - the real `EditorFormToolbar` 2s interval autosave and the REAL
 *   `DraftPublishToolbar` (typed publish errors surfaced inline),
 * - the real `createCollectionEditorActions` route gates + `parseFormPayload`,
 * - the real `editor-convex-bridge` + `mediaStorageTransport` modules,
 * - the real `createMediaAction` upload pipeline with REAL sharp resizes, and
 * - the REAL Convex `cms/*` functions running in `convex-test` under the
 *   deployed schema with act-as identities.
 *
 * Substituted wires only: the `@nordcom/commerce-db` identity transport routes
 * into convex-test, global `fetch` plays the storage byte sink (convex-test
 * exposes no HTTP upload endpoint), the NextAuth mint is stubbed, and
 * `@nordcom/nordstar`'s CSS-module `Button` renders as a plain button.
 */
import { createCollectionEditorActions } from '@nordcom/commerce-cms/editor';
import { pagesEditor } from '@nordcom/commerce-cms/editor/manifests';
import { EditorEditPage, EditorNewPage } from '@nordcom/commerce-cms/editor/ui';
import type { Page } from '@nordcom/commerce-cms/types';
import { createUnitConvex } from '@nordcom/commerce-test-convex/unit';
import { ConvexError } from 'convex/values';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { act, fireEvent, render } from '@/utils/test/react';

import schema from '../../../../packages/convex/convex/schema';

/**
 * Real timer handle captured before `vi.useFakeTimers` swaps the globals, so
 * the upload pipeline's genuinely asynchronous legs (sharp's libuv threadpool)
 * can be awaited with real event-loop turns while the autosave clock stays
 * frozen.
 */
const realSetTimeout = globalThis.setTimeout.bind(globalThis);

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
    usePathname: () => '/gate-shop.example.com/content/pages/new/',
    useSearchParams: () => new URLSearchParams('locale=en-US'),
}));
vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={String(href)} {...rest}>
            {children}
        </a>
    ),
}));

// Nordstar pulls CSS modules the node transform rejects; its Button renders
// functionally so the REAL DraftPublishToolbar (error surfacing included)
// stays under test.
vi.mock('@nordcom/nordstar', () => ({
    Button: ({
        children,
        disabled,
        onClick,
    }: {
        children: React.ReactNode;
        disabled?: boolean;
        onClick?: () => void;
    }) => (
        <button type="button" disabled={disabled} onClick={onClick}>
            {children}
        </button>
    ),
}));
vi.mock('@/components/cms/collection-table', () => ({ CollectionTable: vi.fn() }));
vi.mock('@/components/shell/empty-state', () => ({ EmptyState: vi.fn() }));

// Session/Payload seams the runtime touches but this gate replaces with act-as
// context (the authoritative enforcement is the Convex side, driven for real).
vi.mock('./payload-ctx', () => ({ getAuthedPayloadCtx: vi.fn() }));
vi.mock('./convex-auth', () => ({ authenticateConvexClient: vi.fn(async () => 'operator-bearer-token') }));
vi.mock('./convex-token', () => ({ mintConvexOperatorToken: vi.fn(async () => 'operator-bearer-token') }));

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

import { makeFunctionReference } from 'convex/server';
import { revalidatePath } from 'next/cache';
import { editorConvexBridge } from './editor-convex-bridge';
import { editorRuntime } from './editor-runtime';
import { getAuthedPayloadCtx } from './payload-ctx';

const TRUSTED_ISSUER = 'https://admin.gate.nordcom.io';
const OPERATOR_EMAIL = 'gate-operator@example.com';
const OUTSIDER_EMAIL = 'gate-outsider@example.com';
const DOMAIN = 'gate-shop.example.com';
const SHOP_PUBLIC_ID = 'gate_shop_pages';
const SERVER_SECRET = 'test-server-secret';
const NOW = 1_700_000_000_000;

/** The canonical block order the picker adds in this gate — the full frozen set. */
const ALL_BLOCK_TYPES = [
    'columns',
    'alert',
    'banner',
    'collection',
    'html',
    'media-grid',
    'overview',
    'rich-text',
    'vendors',
] as const;

/** A real, decodable 1x1 PNG — the tiny fixture the sharp pass resizes for real. */
const TINY_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/** The frozen derivative sizes and their exact output dimensions (media/sizes.ts). */
const FROZEN_SIZES = [
    { name: 'thumbnail', width: 320, height: 240 },
    { name: 'card', width: 768, height: 576 },
    { name: 'feature', width: 1280, height: 720 },
    { name: 'hero', width: 1920, height: 1080 },
] as const;

/** A minimal authored ProseMirror document for the rich-text blocks. */
const PM_DOC = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Gate body' }] }] };

/** The deployed Convex cms modules convex-test resolves the gate's function names against. */
const modules = {
    '/convex/cms/actions.ts': () => import('../../../../packages/convex/convex/cms/actions'),
    '/convex/cms/documents.ts': () => import('../../../../packages/convex/convex/cms/documents'),
    '/convex/cms/versions.ts': () => import('../../../../packages/convex/convex/cms/versions'),
    '/convex/cms/list.ts': () => import('../../../../packages/convex/convex/cms/list'),
    '/convex/cms/media.ts': () => import('../../../../packages/convex/convex/cms/media'),
    '/convex/cms/media_derivatives.ts': () => import('../../../../packages/convex/convex/cms/media_derivatives'),
    '/convex/cms/read.ts': () => import('../../../../packages/convex/convex/cms/read'),
};

const pageBySlugRef = makeFunctionReference<'query', Record<string, unknown>, Record<string, unknown> | null>(
    'cms/read:pageBySlug',
);

type SeededTenant = { shopId: string };

/**
 * Builds a fresh harness and seeds one tenant: the operator (admin
 * collaborator), an outsider platform user with NO collaborator row, and the
 * `shops` row (with the public legacy id the storefront read resolves).
 *
 * @returns The seeded shop id (as a string for ctx wiring).
 */
async function seedTenant(): Promise<SeededTenant> {
    const t = createUnitConvex(schema, modules);
    h.harness = t;
    // Pre-warm the function modules: convex-test imports them lazily on first
    // call, and a COLD dynamic import needs a real event-loop turn — which a
    // chain started inside `vi.advanceTimersByTimeAsync` (the 2s autosave tick)
    // never gets under frozen fake timers.
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
            legacyId: SHOP_PUBLIC_ID,
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
    vi.mocked(getAuthedPayloadCtx).mockResolvedValue({
        payload: {} as never,
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
 * Installs the storage byte-sink double: convex-test exposes no HTTP upload
 * endpoint, so every POST the upload pipeline issues against a
 * `generateUploadUrl` URL stores the body straight into the harness's storage
 * and answers with the Convex `{ storageId }` wire shape.
 */
function stubStorageByteSink(): void {
    vi.stubGlobal(
        'fetch',
        vi.fn(async (_input: unknown, init?: { body?: unknown }) => {
            const t = h.harness as {
                run: (
                    fn: (ctx: { storage: { store: (blob: Blob) => Promise<unknown> } }) => Promise<unknown>,
                ) => Promise<unknown>;
            };
            const body = init?.body;
            const bytes = body instanceof Uint8Array ? body : new Uint8Array(0);
            const storageId = await t.run(async (ctx) => ctx.storage.store(new Blob([bytes as BlobPart])));
            return new Response(JSON.stringify({ storageId: String(storageId) }), { status: 200 });
        }),
    );
}

/**
 * Renders the REAL pages creation form through the real runtime and the
 * factory-built (codegen-equivalent) actions.
 *
 * @returns The testing-library render result.
 */
async function renderNewPage() {
    const actions = createCollectionEditorActions(pagesEditor, editorRuntime);
    const ui = await EditorNewPage({
        manifest: pagesEditor,
        runtime: editorRuntime,
        params: { domain: DOMAIN },
        searchParams: { locale: 'en-US' },
        generatedActions: actions,
    });
    return render(ui as ReactElement);
}

/**
 * Renders the REAL pages edit form for an existing document id.
 *
 * @param id - The live `cmsDocuments` id.
 * @returns The testing-library render result.
 */
async function renderEditPage(id: string) {
    const actions = createCollectionEditorActions(pagesEditor, editorRuntime);
    const ui = await EditorEditPage({
        manifest: pagesEditor,
        runtime: editorRuntime,
        params: { domain: DOMAIN, id },
        searchParams: { locale: 'en-US' },
        generatedActions: actions,
    });
    return render(ui as ReactElement);
}

type CmsRow = { _id: string; collection: string; data: Record<string, unknown>; status: string };

/**
 * Reads the tenant's `pages` rows straight off the raw db, insertion order.
 *
 * @returns The pages rows.
 */
async function pageRows(): Promise<CmsRow[]> {
    const t = h.harness as {
        run: (
            fn: (ctx: { db: { query: (t: string) => { collect: () => Promise<CmsRow[]> } } }) => Promise<CmsRow[]>,
        ) => Promise<CmsRow[]>;
    };
    const rows = await t.run(async (ctx) => ctx.db.query('cmsDocuments').collect());
    return rows.filter((row) => row.collection === 'pages');
}

/**
 * Reads a whole table off the raw db (media + derivative assertions).
 *
 * @param table - The table name.
 * @returns The rows.
 */
async function tableRows<Row>(table: string): Promise<Row[]> {
    const t = h.harness as {
        run: (
            fn: (ctx: { db: { query: (t: string) => { collect: () => Promise<Row[]> } } }) => Promise<Row[]>,
        ) => Promise<Row[]>;
    };
    return t.run(async (ctx) => ctx.db.query(table).collect());
}

/**
 * Collects the `_scheduled_functions` rows — the post-commit work a mutation
 * armed. Frozen timers keep every row PENDING, so the gate asserts WHAT was
 * scheduled without ever executing it.
 *
 * @returns The scheduled-function system rows.
 */
async function scheduledFunctions(): Promise<unknown[]> {
    type SystemCtx = { db: { system: { query: (table: string) => { collect: () => Promise<unknown[]> } } } };
    const t = h.harness as { run: (fn: (ctx: SystemCtx) => Promise<unknown[]>) => Promise<unknown[]> };
    return t.run(async (ctx) => ctx.db.system.query('_scheduled_functions').collect());
}

/**
 * Awaits a genuinely asynchronous pipeline (sharp's threadpool, the byte-sink
 * round trips) on REAL event-loop turns — the frozen fake timers only
 * intercept timer APIs, so yielding through the captured real `setTimeout`
 * lets IO completions land while the autosave clock stays still.
 *
 * @param predicate - Resolves `true` once the pipeline's effects are visible.
 */
async function settle(predicate: () => Promise<boolean>): Promise<void> {
    for (let i = 0; i < 2000; i++) {
        if (await predicate()) return;
        await new Promise<void>((resolve) => realSetTimeout(resolve, 0));
    }
    throw new TypeError('async pipeline never settled');
}

/** Asserts a control exists inside the field shell at `path` and returns it. */
function controlAt(container: HTMLElement, path: string, selector: string): HTMLElement {
    const shell = container.querySelector(`[data-testid="field-${path}"]`);
    if (!shell) throw new TypeError(`no field shell rendered for \`${path}\``);
    const control = shell.querySelector(selector);
    if (!control) throw new TypeError(`no \`${selector}\` control in \`${path}\` shell`);
    return control as HTMLElement;
}

/**
 * Adds one block row of `type` to a blocks widget through its real picker +
 * add control.
 *
 * @param container - The render root.
 * @param path - The blocks field's dotted path.
 * @param type - The block type slug to add.
 */
async function addBlock(container: HTMLElement, path: string, type: string): Promise<void> {
    const picker = container.querySelector(`[data-testid="blocks-picker-${path}"]`) as HTMLSelectElement | null;
    const add = container.querySelector(`[data-testid="blocks-add-${path}"]`) as HTMLButtonElement | null;
    if (!picker || !add) throw new TypeError(`no blocks controls at \`${path}\``);
    await act(async () => {
        fireEvent.change(picker, { target: { value: type } });
    });
    await act(async () => {
        fireEvent.click(add);
    });
}

/**
 * Edits a leaf control's value through the real widget.
 *
 * @param container - The render root.
 * @param path - The field's dotted path.
 * @param selector - The control selector inside the shell.
 * @param value - The new value.
 */
async function setLeaf(container: HTMLElement, path: string, selector: string, value: string): Promise<void> {
    await act(async () => {
        fireEvent.change(controlAt(container, path, selector), { target: { value } });
    });
}

beforeEach(() => {
    vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
    vi.stubEnv('CONVEX_SERVER_SECRET', SERVER_SECRET);
    stubStorageByteSink();
    // Frozen timers keep publish's `runAfter(0)` revalidation schedule PENDING
    // (`revalidate/onPublish` is deliberately absent from the module map) and
    // drive the 2s autosave deterministically.
    vi.useFakeTimers({ now: NOW });
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    h.harness = null;
    h.identity = null;
    h.gate = null;
});

describe('CMSGATE-02 — pages editor end to end (real engine, real Convex functions, real sharp)', () => {
    it('authors all nine blocks + a real media upload, autosaves once, publishes, reads back on the frozen contract, and restores', async () => {
        const { shopId } = await seedTenant();
        actAsOperator(shopId);

        // ── CREATE form: author the full nine-block page. ──
        const { container } = await renderNewPage();

        await setLeaf(container, 'title', 'input', 'Gate page title');
        await setLeaf(container, 'slug', 'input', 'gate-page');

        for (const type of ALL_BLOCK_TYPES) {
            await addBlock(container, 'blocks', type);
        }
        for (const [index, type] of ALL_BLOCK_TYPES.entries()) {
            const row = container.querySelector(`[data-row-index="${index}"][data-block-type="${type}"]`);
            expect(row, `blocks row ${index} should be a ${type} block`).not.toBeNull();
        }

        // columns (row 0): minRows-1 column row mounts; nest a rich-text block
        // inside its `content` — the ProseMirror block inside the layout block.
        await addBlock(container, 'blocks.0.columns.0.content', 'rich-text');
        await setLeaf(container, 'blocks.0.columns.0.content.0.body', 'textarea', JSON.stringify(PM_DOC));

        // Leaf edits across the remaining block types (localized leaves land in
        // the active en-US bucket slot).
        await setLeaf(container, 'blocks.1.title', 'input', 'Gate alert');
        await setLeaf(container, 'blocks.2.heading', 'input', 'Gate banner');
        await setLeaf(container, 'blocks.3.handle', 'input', 'frontpage');
        await setLeaf(container, 'blocks.4.html', 'textarea', '<p>gate</p>');
        await setLeaf(container, 'blocks.6.title', 'input', 'Gate overview');
        await setLeaf(container, 'blocks.7.body', 'textarea', JSON.stringify(PM_DOC));
        await setLeaf(container, 'blocks.8.title', 'input', 'Gate vendors');

        // ── REAL media upload through the live transport. ──
        // media-grid (row 5) mounts its minRows-1 item row; picking a file runs
        // EditorFields' bound action → createMediaAction → byte sink → finalize
        // → REAL sharp pass → saveDerivatives.
        const fileInput = controlAt(container, 'blocks.5.items.0.image', 'input[type="file"]') as HTMLInputElement;
        const png = Uint8Array.from(atob(TINY_PNG_BASE64), (char) => char.charCodeAt(0));
        const file = new File([png], 'gate-image.png', { type: 'image/png' });
        Object.defineProperty(fileInput, 'files', { value: [file] });
        await act(async () => {
            fireEvent.change(fileInput);
        });

        type DerivativeRow = { size: string; status: string; storageId?: string; width?: number; height?: number };
        type MediaRow = { _id: string; alt: string; width?: number; height?: number; focalX?: number; focalY?: number };
        await act(async () => {
            await settle(async () => {
                const rows = await tableRows<DerivativeRow>('cmsMediaDerivatives');
                return rows.length === 4 && rows.every((row) => row.status === 'ready');
            });
        });

        const mediaRows = await tableRows<MediaRow>('cmsMedia');
        expect(mediaRows).toHaveLength(1);
        const media = mediaRows[0];
        if (!media) throw new TypeError('media row missing');
        // The sharp pass recorded the decoded original's dimensions + focal.
        expect({ width: media.width, height: media.height }).toEqual({ width: 1, height: 1 });
        expect({ x: media.focalX, y: media.focalY }).toEqual({ x: 0.5, y: 0.5 });

        // All four frozen sizes are READY at their exact output dimensions —
        // proof the resize ran for real, not a mocked pass.
        const derivativeRows = await tableRows<DerivativeRow>('cmsMediaDerivatives');
        const bySize = new Map(derivativeRows.map((row) => [row.size, row]));
        for (const size of FROZEN_SIZES) {
            const row = bySize.get(size.name);
            expect(row?.status).toBe('ready');
            expect(row?.storageId).toBeTruthy();
            expect({ width: row?.width, height: row?.height }).toEqual({ width: size.width, height: size.height });
        }

        // The widget stored the persisted media id in form state.
        const storedId = container.querySelector('[data-testid="upload-blocks.5.items.0.image-value"]');
        expect(storedId?.textContent).toBe(media._id);

        // ── ONE 2s autosave tick creates exactly one draft document. ──
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        const drafts = await pageRows();
        expect(drafts).toHaveLength(1);
        const draft = drafts[0];
        if (!draft) throw new TypeError('draft row missing');
        expect(draft.status).toBe('draft');
        expect(draft.data.title).toEqual({ 'en-US': 'Gate page title' });
        expect(draft.data.slug).toBe('gate-page');
        const draftBlocks = draft.data.blocks as Array<Record<string, unknown>>;
        expect(draftBlocks.map((block) => block.blockType)).toEqual([...ALL_BLOCK_TYPES]);
        const draftColumns = draftBlocks[0]?.columns as Array<Record<string, unknown>>;
        const nested = (draftColumns[0]?.content as Array<Record<string, unknown>>)[0];
        expect(nested?.blockType).toBe('rich-text');
        expect(nested?.body).toEqual({ 'en-US': PM_DOC });
        const mediaGridItems = draftBlocks[5]?.items as Array<Record<string, unknown>>;
        expect(mediaGridItems[0]?.image).toBe(media._id);
        // The draft transition schedules ZERO storefront revalidation work —
        // create/upload only refresh the operator's own admin paths.
        expect(await scheduledFunctions()).toHaveLength(0);
        for (const call of vi.mocked(revalidatePath).mock.calls) {
            expect(String(call[0])).toMatch(new RegExp(`^/${DOMAIN}/`));
        }

        // ── G4FIX-04: the toolbar bound the created id, so further diverged
        // ticks on the SAME /new/ mount save drafts against that one row —
        // never another create. Two more ticks through the REAL engine prove
        // the row count stays pinned at one. ──
        await setLeaf(container, 'title', 'input', 'Gate page title v2');
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        await setLeaf(container, 'title', 'input', 'Gate page title');
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        const afterBoundTicks = await pageRows();
        expect(afterBoundTicks).toHaveLength(1);
        expect(afterBoundTicks[0]?.data.title).toEqual({ 'en-US': 'Gate page title' });

        // ── EDIT PAGE: live relationship options come off the REAL Convex list. ──
        const edit = await renderEditPage(draft._id);
        await setLeaf(edit.container, 'blocks.2.cta.kind', 'select', 'page');
        const pagePicker = controlAt(edit.container, 'blocks.2.cta.page', 'select') as HTMLSelectElement;
        const optionLabels = Array.from(pagePicker.options).map((option) => option.textContent);
        expect(optionLabels).toContain('Gate page title');

        // ── PUBLISH via the REAL toolbar button. ──
        const publishButton = Array.from(edit.container.querySelectorAll('button')).find(
            (button) => button.textContent === 'Publish',
        );
        if (!publishButton) throw new TypeError('no Publish button rendered');
        await act(async () => {
            fireEvent.click(publishButton);
            await vi.advanceTimersByTimeAsync(0);
        });
        const [published] = await pageRows();
        expect(published?.status).toBe('published');
        // The publish transition — and ONLY it — armed the post-commit
        // revalidation hook (kept pending by the frozen timers).
        expect(await scheduledFunctions()).toHaveLength(1);

        // ── FROZEN READ CONTRACT: the storefront-facing read returns the page
        // on the SFREAD-01 shape, nested localized buckets collapsed. ──
        const t = h.harness as {
            query: (ref: unknown, args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
        };
        const readBack = (await t.query(pageBySlugRef, {
            serverSecret: SERVER_SECRET,
            shopId: SHOP_PUBLIC_ID,
            slug: 'gate-page',
            locale: 'en-US',
        })) as (Page & Record<string, unknown>) | null;
        if (!readBack) throw new TypeError('published page unreadable through cms/read:pageBySlug');
        expect(readBack.id).toBe(published?._id);
        expect(readBack.title).toBe('Gate page title');
        expect(readBack.slug).toBe('gate-page');
        expect(readBack._status).toBe('published');
        // Payload bookkeeping frame: ISO timestamps (creation at the autosave
        // tick, update at the publish — the fake clock advanced between them).
        const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
        expect(readBack.createdAt).toMatch(isoPattern);
        expect(readBack.updatedAt).toMatch(isoPattern);
        expect(Date.parse(readBack.updatedAt)).toBeGreaterThanOrEqual(Date.parse(readBack.createdAt));
        const contractBlocks = (readBack.blocks ?? []) as unknown as Array<Record<string, unknown>>;
        expect(contractBlocks.map((block) => block.blockType)).toEqual([...ALL_BLOCK_TYPES]);
        // Localized block leaves read back RESOLVED (strings/docs), never buckets.
        expect(contractBlocks[1]?.title).toBe('Gate alert');
        expect(contractBlocks[2]?.heading).toBe('Gate banner');
        const readColumns = contractBlocks[0]?.columns as Array<Record<string, unknown>>;
        const readNested = (readColumns[0]?.content as Array<Record<string, unknown>>)[0];
        expect(readNested?.blockType).toBe('rich-text');
        expect(readNested?.body).toEqual(PM_DOC);
        expect((contractBlocks[5]?.items as Array<Record<string, unknown>>)[0]?.image).toBe(media._id);

        // ── EDIT AGAIN (draft v3): the live read stays pinned to the publish. ──
        await setLeaf(edit.container, 'title', 'input', 'Overwritten title');
        const saveDraftButton = Array.from(edit.container.querySelectorAll('button')).find(
            (button) => button.textContent === 'Save Draft',
        );
        if (!saveDraftButton) throw new TypeError('no Save Draft button rendered');
        await act(async () => {
            fireEvent.click(saveDraftButton);
            await vi.advanceTimersByTimeAsync(0);
        });
        const [overwritten] = await pageRows();
        expect(overwritten?.data.title).toEqual({ 'en-US': 'Overwritten title' });
        // The post-publish draft NEVER reaches the storefront read: the published snapshot is
        // pinned through publishedVersionId until the next publish (G4FIX-01), and the doc keeps
        // its published state.
        expect(overwritten?.status).toBe('published');
        const pinned = (await t.query(pageBySlugRef, {
            serverSecret: SERVER_SECRET,
            shopId: SHOP_PUBLIC_ID,
            slug: 'gate-page',
            locale: 'en-US',
        })) as (Page & Record<string, unknown>) | null;
        expect(pinned?.title).toBe('Gate page title');
        expect(pinned?._status).toBe('published');

        // ── THE CMSGATE-02 RACE: a stale in-flight autosave (crafted against the pre-publish
        // version) lands AFTER the publish. It must merge forward as a draft — flagged, never
        // unpublishing, never changing what the storefront serves. ──
        const history = await editorConvexBridge.listVersions({ documentId: draft._id });
        const prePublishVersion = history[0];
        if (!prePublishVersion) throw new TypeError('version history missing');
        const staleResult = await editorConvexBridge.saveDraft({
            collection: 'pages',
            data: overwritten?.data ?? {},
            locale: 'en-US',
            documentId: draft._id,
            baseVersionId: prePublishVersion.versionId,
        });
        expect(staleResult.conflict).toBe('publish-superseded-base');
        const [afterStale] = await pageRows();
        expect(afterStale?.status).toBe('published');
        const stillPinned = (await t.query(pageBySlugRef, {
            serverSecret: SERVER_SECRET,
            shopId: SHOP_PUBLIC_ID,
            slug: 'gate-page',
            locale: 'en-US',
        })) as (Page & Record<string, unknown>) | null;
        expect(stillPinned?.title).toBe('Gate page title');

        // ── RESTORE the published snapshot. ──
        const versions = await editorConvexBridge.listVersions({ documentId: draft._id });
        const publishedVersion = versions.find((version) => version.status === 'published');
        if (!publishedVersion) throw new TypeError('published version missing');
        const actions = createCollectionEditorActions(pagesEditor, editorRuntime);
        await actions.restoreVersion(DOMAIN, draft._id, publishedVersion.versionId);

        const [restored] = await pageRows();
        // A restore re-materializes into the WORKING DRAFT: the published state stays pinned
        // (no unpublish — G4FIX-01) and a publish is still required to make it live.
        expect(restored?.status).toBe('published');
        expect(restored?.data).toEqual(published?.data);
        const restoredItems = (restored?.data.blocks as Array<Record<string, unknown>>)[5]?.items as Array<
            Record<string, unknown>
        >;
        expect(restoredItems[0]?.image).toBe(media._id);
    });

    it('autosaves a draft with the required title EMPTY, then publish fails closed with the typed error surfaced in the REAL toolbar', async () => {
        const { shopId } = await seedTenant();
        actAsOperator(shopId);

        const { container } = await renderNewPage();
        // Only the slug — `title` (server-required for publish) stays empty.
        await setLeaf(container, 'slug', 'input', 'half-finished');
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        const [draft] = await pageRows();
        expect(draft?.status).toBe('draft');
        expect(draft?.data.title).toBeUndefined();

        // The authoritative layer rejects the publish with the stable code.
        const denied = await editorConvexBridge
            .publish({ collection: 'pages', data: draft?.data ?? {}, locale: 'en-US', documentId: draft?._id })
            .then(
                () => {
                    throw new TypeError('expected the title-less publish to reject');
                },
                (cause: unknown) => cause,
            );
        expect(denied).toBeInstanceOf(ConvexError);
        expect((denied as ConvexError<{ code: string }>).data.code).toBe('CMS_REQUIRED_FIELD_MISSING');

        // The REAL DraftPublishToolbar surfaces that rejection inline.
        const edit = await renderEditPage(String(draft?._id));
        const publishButton = Array.from(edit.container.querySelectorAll('button')).find(
            (button) => button.textContent === 'Publish',
        );
        if (!publishButton) throw new TypeError('no Publish button rendered');
        await act(async () => {
            fireEvent.click(publishButton);
            await vi.advanceTimersByTimeAsync(0);
        });
        const alert = edit.container.querySelector('[role="alert"]');
        expect(alert?.textContent).toMatch(/required field/i);
        // And the document stayed a draft.
        const [stillDraft] = await pageRows();
        expect(stillDraft?.status).toBe('draft');
    });

    it('never clobbers a keystroke typed while an autosave is in flight (full-stack interleaving)', async () => {
        const { shopId } = await seedTenant();
        actAsOperator(shopId);

        // Seed one draft through the REAL create mutation, then edit it.
        await editorConvexBridge.create({
            collection: 'pages',
            data: { title: { 'en-US': 'Clobber check' }, slug: 'clobber-check' },
            locale: 'en-US',
        });
        const [seeded] = await pageRows();
        if (!seeded) throw new TypeError('seeded page missing');
        const { container } = await renderEditPage(seeded._id);

        // Edit field B (slug), then hold its autosave in flight.
        await setLeaf(container, 'slug', 'input', 'clobber-check-2');
        let release: (() => void) | undefined;
        h.gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });

        // While the save is in flight, the user types into field A (title).
        await setLeaf(container, 'title', 'input', 'Mid-flight title');

        // Release the wire; the held save lands with B's value.
        h.gate = null;
        await act(async () => {
            release?.();
            await vi.advanceTimersByTimeAsync(0);
        });
        const [afterFirst] = await pageRows();
        expect(afterFirst?.data.slug).toBe('clobber-check-2');

        // A's keystroke SURVIVED the round-trip and posts on the next tick.
        expect((controlAt(container, 'title', 'input') as HTMLInputElement).value).toBe('Mid-flight title');
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });
        const [afterSecond] = await pageRows();
        expect(afterSecond?.data.title).toEqual({ 'en-US': 'Mid-flight title' });
        expect(afterSecond?.data.slug).toBe('clobber-check-2');
    });

    it('loads relationship options from the real bounded Convex list paths (content + media)', async () => {
        const { shopId } = await seedTenant();
        actAsOperator(shopId);

        await editorConvexBridge.create({
            collection: 'pages',
            data: { title: { 'en-US': 'Linkable page' }, slug: 'linkable' },
            locale: 'en-US',
        });
        const pageOptions = await editorConvexBridge.listRelationshipOptions({ relationTo: 'pages' });
        expect(pageOptions).toHaveLength(1);
        expect(pageOptions[0]?.label).toBe('Linkable page');

        // Store a media row through the REAL upload pipeline pieces, then list it.
        const t = h.harness as {
            run: (
                fn: (ctx: { storage: { store: (blob: Blob) => Promise<unknown> } }) => Promise<unknown>,
            ) => Promise<unknown>;
        };
        const storageId = await t.run(async (ctx) => ctx.storage.store(new Blob([new Uint8Array([1])])));
        const finalizeRef = makeFunctionReference<'mutation'>('cms/media:finalizeUpload');
        const caller = (
            h.harness as {
                withIdentity: (i: object) => {
                    mutation: (ref: unknown, args: Record<string, unknown>) => Promise<unknown>;
                };
            }
        ).withIdentity(h.identity as object);
        await caller.mutation(finalizeRef, {
            storageId,
            filename: 'pic.png',
            mimeType: 'image/png',
            alt: 'Gate picture',
        });
        const mediaOptions = await editorConvexBridge.listRelationshipOptions({ relationTo: 'media' });
        expect(mediaOptions).toHaveLength(1);
        expect(mediaOptions[0]?.label).toBe('Gate picture');

        // An unknown/non-CMS target degrades to zero options, never a crash.
        await expect(editorConvexBridge.listRelationshipOptions({ relationTo: 'shops' })).resolves.toEqual([]);
    });

    it('denies a non-member at the route gate AND at the authoritative Convex layer', async () => {
        const { shopId } = await seedTenant();

        h.identity = { issuer: TRUSTED_ISSUER, subject: 'github|gate-outsider', email: OUTSIDER_EMAIL };
        vi.mocked(getAuthedPayloadCtx).mockResolvedValue({
            payload: {} as never,
            user: {
                id: 'user_outsider',
                email: OUTSIDER_EMAIL,
                role: 'editor',
                tenants: [],
                collection: 'users',
            },
            tenant: { id: shopId, slug: 'gate_shop', defaultLocale: 'en-US', locales: ['en-US'] },
        } as never);
        // The edit page's `tenantMember` read gate 404s an editor with no
        // membership before any bridge read runs.
        await expect(renderEditPage('any-id')).rejects.toThrow('NEXT_NOT_FOUND');

        // Authoritative layer: the same identity through the REAL bridge module
        // is rejected by the Convex tenant resolver.
        const denied = await editorConvexBridge
            .create({ collection: 'pages', data: { slug: 'pwned' }, locale: 'en-US' })
            .then(
                () => {
                    throw new TypeError('expected the non-member create to reject');
                },
                (cause: unknown) => cause,
            );
        expect(denied).toBeInstanceOf(ConvexError);
        expect((denied as ConvexError<{ code: string }>).data.code).toBe('NO_SHOP_MEMBERSHIP');
        expect(await pageRows()).toHaveLength(0);
    });
});
