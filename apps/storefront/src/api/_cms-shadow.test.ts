import { lexicalToProseMirror } from '@nordcom/commerce-cms/editor/richtext';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    __setCmsShadowTransport,
    type CmsShadowTransport,
    findCmsDivergence,
    flushCmsShadows,
    isCmsGetterFlipped,
    isCmsShadowEnabled,
    normalizeCmsValue,
    parseCmsReadFlip,
    runCmsDualRead,
} from './_cms-shadow';

/**
 * Builds a deterministic env for the dual-read levers: ambient `CMS_READ_*` values are dropped so
 * the host machine's own configuration can never leak into an assertion.
 *
 * @param vars - The lever values the test pins.
 * @returns A process-env clone carrying exactly the requested levers.
 */
const makeEnv = (vars: Record<string, string> = {}): NodeJS.ProcessEnv => {
    const env = { ...process.env };
    delete env.CMS_READ_SHADOW;
    delete env.CMS_READ_FLIP;
    return { ...env, ...vars };
};

const OFF_ENV = makeEnv();
const SHADOW_ENV = makeEnv({ CMS_READ_SHADOW: '1' });

/** Lexical body identical to the SFREAD-01 golden `ARTICLE_DOC.body` seed. */
const LEXICAL_BODY = {
    root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'EN body' }] }] },
};

/** Populated depth-2 Media relation from the SFREAD-01 golden seed. */
const MEDIA = {
    id: 'media-1',
    alt: 'Hero',
    url: 'https://cdn.test/hero.png',
    mimeType: 'image/png',
    width: 1600,
    height: 900,
};

/** The canonical Mongo-served article — the SFREAD-01 golden `ARTICLE_DOC` shape. */
const MONGO_ARTICLE = {
    id: 'article-1',
    slug: 'launch-news',
    title: 'Launch News',
    author: 'Editorial',
    publishedAt: '2026-05-02T00:00:00.000Z',
    excerpt: 'We launched.',
    body: LEXICAL_BODY,
    tags: ['news', 'release'],
    cover: MEDIA,
    _status: 'published',
    updatedAt: '2026-05-02T00:00:00.000Z',
    createdAt: '2026-04-02T00:00:00.000Z',
};

/**
 * The Convex twin of the canonical article: a different backend id, different managed timestamps,
 * and the rich-text body stored as the codec-converted ProseMirror document — exactly what the ETL
 * produces for the same source content.
 */
const CONVEX_ARTICLE = {
    ...MONGO_ARTICLE,
    id: 'kg2abc123convexid',
    body: lexicalToProseMirror(LEXICAL_BODY),
    updatedAt: '2026-06-01T11:22:33.000Z',
    createdAt: '2026-06-01T11:22:33.000Z',
};

/**
 * Builds a spy transport whose query resolves (or rejects) with the supplied shadow value.
 *
 * @param convexValue - The value the Convex query leg resolves with.
 * @returns The transport plus its spies.
 */
function makeTransport(convexValue: unknown): CmsShadowTransport & {
    query: ReturnType<typeof vi.fn>;
    mutation: ReturnType<typeof vi.fn>;
} {
    const query = vi.fn().mockResolvedValue(convexValue);
    const mutation = vi.fn().mockResolvedValue(null);
    return { query, mutation };
}

/**
 * Runs the article getter through the dual-read loader against an injected transport.
 *
 * @param env - The environment driving the shadow/flip levers.
 * @param overrides - Optional mongo result override.
 * @returns The served result plus the mongo spy.
 */
async function runArticleRead(env: NodeJS.ProcessEnv, overrides: { mongo?: unknown } = {}) {
    const mongo = vi.fn().mockResolvedValue(overrides.mongo ?? MONGO_ARTICLE);
    const result = await runCmsDualRead<unknown>({
        getter: 'article',
        shopId: 'shop-x',
        locale: 'en-US',
        key: 'launch-news',
        mongo,
        convex: (query) => query('cms/read:articleBySlug', { shopId: 'shop-x', slug: 'launch-news', locale: 'en-US' }),
        env,
    });
    return { result, mongo };
}

afterEach(() => {
    __setCmsShadowTransport(null);
    vi.restoreAllMocks();
});

describe('flip + shadow levers', () => {
    it('parses CMS_READ_FLIP as a comma/space separated getter set with a wildcard', () => {
        expect(parseCmsReadFlip(undefined).size).toBe(0);
        expect(parseCmsReadFlip('header, page articles')).toEqual(new Set(['header', 'page', 'articles']));
        expect(parseCmsReadFlip('-header, -*')).toEqual(new Set(['-header', '-*']));
        expect(isCmsGetterFlipped('page', makeEnv({ CMS_READ_FLIP: 'header,page' }))).toBe(true);
        expect(isCmsGetterFlipped('footer', makeEnv({ CMS_READ_FLIP: 'header,page' }))).toBe(false);
        expect(isCmsGetterFlipped('footer', makeEnv({ CMS_READ_FLIP: '*' }))).toBe(true);
    });

    it('defaults the CUTOVER-04 gate cohort (header/page/pages) to Convex; everything else stays Mongo', () => {
        for (const getter of ['header', 'page', 'pages'] as const) {
            expect(isCmsGetterFlipped(getter, OFF_ENV)).toBe(true);
        }
        for (const getter of ['footer', 'businessData', 'article', 'articles'] as const) {
            expect(isCmsGetterFlipped(getter, OFF_ENV)).toBe(false);
        }
    });

    it('inverts the env lever for the flipped cohort: `-getter` is the per-getter emergency-shadow switch', () => {
        const env = makeEnv({ CMS_READ_FLIP: '-header' });
        expect(isCmsGetterFlipped('header', env)).toBe(false);
        // Only the negated getter unflips — the rest of the cohort keeps serving Convex.
        expect(isCmsGetterFlipped('page', env)).toBe(true);
        expect(isCmsGetterFlipped('pages', env)).toBe(true);
    });

    it('resolves precedence most-specific first: name beats wildcard beats cohort default', () => {
        // Wildcard negation unflips the cohort defaults…
        expect(isCmsGetterFlipped('header', makeEnv({ CMS_READ_FLIP: '-*' }))).toBe(false);
        // …but an explicit name still wins over it.
        expect(isCmsGetterFlipped('article', makeEnv({ CMS_READ_FLIP: 'article,-*' }))).toBe(true);
        // A per-getter negation wins over the flip-everything wildcard.
        expect(isCmsGetterFlipped('header', makeEnv({ CMS_READ_FLIP: '-header,*' }))).toBe(false);
        expect(isCmsGetterFlipped('footer', makeEnv({ CMS_READ_FLIP: '-header,*' }))).toBe(true);
    });

    it('treats the shadow as opt-in (default OFF) with kill-style truthy values', () => {
        expect(isCmsShadowEnabled(OFF_ENV)).toBe(false);
        expect(isCmsShadowEnabled(makeEnv({ CMS_READ_SHADOW: 'off' }))).toBe(false);
        for (const value of ['1', 'true', 'on', 'enabled', 'TRUE']) {
            expect(isCmsShadowEnabled(makeEnv({ CMS_READ_SHADOW: value }))).toBe(true);
        }
    });
});

describe('normalization', () => {
    it('converts Lexical to ProseMirror and strips volatile fields, so the canonical twins compare equal', () => {
        expect(findCmsDivergence(normalizeCmsValue(MONGO_ARTICLE), normalizeCmsValue(CONVEX_ARTICLE))).toBeNull();
    });

    it('collapses explicit null with absent fields', () => {
        expect(
            findCmsDivergence(normalizeCmsValue({ slug: 'a', seo: null }), normalizeCmsValue({ slug: 'a' })),
        ).toBeNull();
    });

    it('reports the first differing path for real content drift', () => {
        const planted = { ...CONVEX_ARTICLE, title: 'Launch News!' };
        const detail = findCmsDivergence(normalizeCmsValue(MONGO_ARTICLE), normalizeCmsValue(planted));
        expect(detail).toContain('$.title');
    });
});

describe('runCmsDualRead — default (both levers off)', () => {
    it('serves Mongo and never touches the Convex transport: nothing observable changes', async () => {
        const transport = makeTransport(CONVEX_ARTICLE);
        __setCmsShadowTransport(transport);

        const { result, mongo } = await runArticleRead(OFF_ENV);
        await flushCmsShadows();

        expect(result).toEqual(MONGO_ARTICLE);
        expect(mongo).toHaveBeenCalledTimes(1);
        expect(transport.query).not.toHaveBeenCalled();
        expect(transport.mutation).not.toHaveBeenCalled();
    });
});

describe('runCmsDualRead — shadow mode', () => {
    it('records ZERO divergence for the identical canonical seed after normalization', async () => {
        const transport = makeTransport(CONVEX_ARTICLE);
        __setCmsShadowTransport(transport);

        const { result } = await runArticleRead(SHADOW_ENV);
        await flushCmsShadows();

        expect(result).toEqual(MONGO_ARTICLE);
        expect(transport.query).toHaveBeenCalledTimes(1);
        expect(transport.mutation).not.toHaveBeenCalled();
    });

    it('records a planted divergence (one backend copy mutated) as kind=mismatch', async () => {
        const transport = makeTransport({ ...CONVEX_ARTICLE, excerpt: 'We launched?!' });
        __setCmsShadowTransport(transport);

        const { result } = await runArticleRead(SHADOW_ENV);
        await flushCmsShadows();

        expect(result).toEqual(MONGO_ARTICLE);
        expect(transport.mutation).toHaveBeenCalledTimes(1);
        expect(transport.mutation).toHaveBeenCalledWith(
            'cms/read:recordDivergence',
            expect.objectContaining({
                shop: 'shop-x',
                getter: 'article',
                locale: 'en-US',
                key: 'launch-news',
                kind: 'mismatch',
                detail: expect.stringContaining('$.excerpt'),
            }),
        );
    });

    it('NEVER breaks the page on a Convex shadow failure — serves Mongo, records kind=error', async () => {
        const transport = makeTransport(null);
        transport.query.mockRejectedValue(new TypeError('convex unreachable'));
        __setCmsShadowTransport(transport);

        const { result } = await runArticleRead(SHADOW_ENV);
        await flushCmsShadows();

        expect(result).toEqual(MONGO_ARTICLE);
        expect(transport.mutation).toHaveBeenCalledWith(
            'cms/read:recordDivergence',
            expect.objectContaining({ kind: 'error', detail: 'convex unreachable' }),
        );
    });

    it('swallows ledger-write failures: the shadow is observability, never a dependency', async () => {
        const transport = makeTransport({ ...CONVEX_ARTICLE, title: 'Drifted' });
        transport.mutation.mockRejectedValue(new TypeError('ledger down'));
        __setCmsShadowTransport(transport);

        const { result } = await runArticleRead(SHADOW_ENV);
        await expect(flushCmsShadows()).resolves.toBeUndefined();
        expect(result).toEqual(MONGO_ARTICLE);
    });

    it('compares the projected slice for list getters', async () => {
        const transport = makeTransport({ docs: [CONVEX_ARTICLE], totalDocs: 1 });
        __setCmsShadowTransport(transport);

        const mongo = vi.fn().mockResolvedValue({ docs: [MONGO_ARTICLE], totalDocs: 1, page: 1, limit: 12 });
        await runCmsDualRead<{ docs: unknown[]; totalDocs: number; page: number; limit: number }>({
            getter: 'articles',
            shopId: 'shop-x',
            locale: 'en-US',
            mongo,
            convex: (query) => query('cms/read:articles', { shopId: 'shop-x', locale: 'en-US' }),
            project: (result) => ({ docs: result.docs, totalDocs: result.totalDocs }),
            env: SHADOW_ENV,
        });
        await flushCmsShadows();

        expect(transport.mutation).not.toHaveBeenCalled();
    });
});

describe('runCmsDualRead — per-getter flip', () => {
    const FLIP_ENV = makeEnv({ CMS_READ_FLIP: 'article' });

    it('serves the Convex result for a flipped getter without invoking Mongo', async () => {
        const transport = makeTransport(CONVEX_ARTICLE);
        __setCmsShadowTransport(transport);

        const { result, mongo } = await runArticleRead(FLIP_ENV);
        await flushCmsShadows();

        expect(result).toEqual(CONVEX_ARTICLE);
        expect(mongo).not.toHaveBeenCalled();
    });

    it('leaves unflipped getters on Mongo even while others are flipped', async () => {
        const transport = makeTransport(CONVEX_ARTICLE);
        __setCmsShadowTransport(transport);

        const mongo = vi.fn().mockResolvedValue(MONGO_ARTICLE);
        const result = await runCmsDualRead<unknown>({
            getter: 'footer',
            shopId: 'shop-x',
            locale: 'en-US',
            mongo,
            convex: (query) => query('cms/read:singleton', {}),
            env: FLIP_ENV,
        });
        await flushCmsShadows();

        expect(result).toEqual(MONGO_ARTICLE);
        expect(mongo).toHaveBeenCalledTimes(1);
    });

    it('serves Convex for a default-flipped cohort getter with NO lever set, and retires its shadow', async () => {
        const transport = makeTransport(CONVEX_ARTICLE);
        __setCmsShadowTransport(transport);

        const mongo = vi.fn().mockResolvedValue(MONGO_ARTICLE);
        const result = await runCmsDualRead<unknown>({
            getter: 'header',
            shopId: 'shop-x',
            locale: 'en-US',
            mongo,
            convex: (query) => query('cms/read:singleton', {}),
            // Even with the shadow lever armed, a flipped getter never runs the comparison —
            // the Mongo snapshot is inert for the cohort and would only produce ledger noise.
            env: SHADOW_ENV,
        });
        await flushCmsShadows();

        expect(result).toEqual(CONVEX_ARTICLE);
        expect(mongo).not.toHaveBeenCalled();
        expect(transport.mutation).not.toHaveBeenCalled();
    });

    it('returns a default-flipped getter to the Mongo-authoritative shadow posture under `-getter`', async () => {
        const transport = makeTransport(CONVEX_ARTICLE);
        __setCmsShadowTransport(transport);

        const mongo = vi.fn().mockResolvedValue(MONGO_ARTICLE);
        const result = await runCmsDualRead<unknown>({
            getter: 'header',
            shopId: 'shop-x',
            locale: 'en-US',
            mongo,
            convex: (query) => query('cms/read:singleton', {}),
            env: makeEnv({ CMS_READ_FLIP: '-header', CMS_READ_SHADOW: '1' }),
        });
        await flushCmsShadows();

        // Emergency-shadow mode: the frozen Mongo snapshot serves, the Convex comparison resumes.
        expect(result).toEqual(MONGO_ARTICLE);
        expect(mongo).toHaveBeenCalledTimes(1);
        expect(transport.query).toHaveBeenCalledTimes(1);
    });

    it('falls back to Mongo (and records the failure) when the flipped read throws', async () => {
        const transport = makeTransport(null);
        transport.query.mockRejectedValue(new TypeError('flip target down'));
        __setCmsShadowTransport(transport);

        const { result, mongo } = await runArticleRead(FLIP_ENV);
        await flushCmsShadows();

        expect(result).toEqual(MONGO_ARTICLE);
        expect(mongo).toHaveBeenCalledTimes(1);
        expect(transport.mutation).toHaveBeenCalledWith(
            'cms/read:recordDivergence',
            expect.objectContaining({ kind: 'error', detail: expect.stringContaining('flip-serve failed') }),
        );
    });
});
