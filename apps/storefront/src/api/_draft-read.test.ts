import { getPage } from '@nordcom/commerce-cms/api';
import { draftMode } from 'next/headers';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockCmsPage, mockShop } from '@/utils/test/fixtures';
import { __setCmsShadowTransport, type CmsShadowTransport, flushCmsShadows } from './_cms-shadow';
import { isDraftModeEnabled } from './_draft';
import { PageApi } from './page';

vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getPage: vi.fn() };
});

vi.mock('next/headers', () => ({ draftMode: vi.fn() }));

/** Points `draftMode()` at a fixed enabled/disabled state for one test. */
function setDraftMode(isEnabled: boolean): void {
    vi.mocked(draftMode).mockResolvedValue({ isEnabled } as Awaited<ReturnType<typeof draftMode>>);
}

/** Installs a capturing shadow transport and returns its call log. */
function captureTransport(): { queries: Array<{ name: string; args: Record<string, unknown> }> } {
    const queries: Array<{ name: string; args: Record<string, unknown> }> = [];
    const transport: CmsShadowTransport = {
        query: (name, args) => {
            queries.push({ name, args });
            return Promise.resolve(null);
        },
        mutation: () => Promise.resolve(null),
    };
    __setCmsShadowTransport(transport);
    return { queries };
}

describe('isDraftModeEnabled', () => {
    afterEach(() => {
        vi.mocked(draftMode).mockReset();
    });

    it('reflects the request draft-mode state', async () => {
        setDraftMode(true);
        await expect(isDraftModeEnabled()).resolves.toBe(true);
        setDraftMode(false);
        await expect(isDraftModeEnabled()).resolves.toBe(false);
    });

    it('degrades to false when draftMode() is unavailable (outside a request scope)', async () => {
        vi.mocked(draftMode).mockRejectedValue(new TypeError('`draftMode` was called outside a request scope'));
        await expect(isDraftModeEnabled()).resolves.toBe(false);
    });
});

describe('PageApi draft-read branch', () => {
    afterEach(async () => {
        await flushCmsShadows();
        __setCmsShadowTransport(null);
        vi.mocked(draftMode).mockReset();
        vi.mocked(getPage).mockReset();
        delete process.env.CMS_READ_SHADOW;
        delete process.env.CMS_READ_FLIP;
    });

    it('forwards draft: true into the Payload find when draft mode is on (emergency-shadow mode)', async () => {
        process.env.CMS_READ_FLIP = '-page';
        setDraftMode(true);
        vi.mocked(getPage).mockResolvedValue(mockCmsPage({ id: 'p1', slug: 'about' }) as never);

        const page = await PageApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'about' });
        expect(page?.slug).toBe('about');
        expect(vi.mocked(getPage)).toHaveBeenCalledWith(expect.objectContaining({ draft: true, slug: 'about' }));
    });

    it('keeps the published-only default when draft mode is off (emergency-shadow mode)', async () => {
        process.env.CMS_READ_FLIP = '-page';
        setDraftMode(false);
        vi.mocked(getPage).mockResolvedValue(mockCmsPage({ id: 'p1', slug: 'about' }) as never);

        await PageApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'about' });
        expect(vi.mocked(getPage)).toHaveBeenCalledWith(expect.objectContaining({ draft: false }));
    });

    it('serves the Convex draft read (draft: true arg) in the bare default env — page is default-flipped', async () => {
        setDraftMode(true);
        const { queries } = captureTransport();

        await PageApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'about' });
        expect(queries).toHaveLength(1);
        expect(queries[0]).toMatchObject({
            name: 'cms/read:pageBySlug',
            args: { slug: 'about', locale: 'en-US', draft: true },
        });
        // The Mongo leg is never consulted on a successful flipped read.
        expect(vi.mocked(getPage)).not.toHaveBeenCalled();
    });

    it('omits the draft arg from the default-flipped Convex read outside draft mode', async () => {
        setDraftMode(false);
        const { queries } = captureTransport();

        await PageApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'about' });
        expect(queries[0]?.args).not.toHaveProperty('draft');
    });

    it('never schedules the divergence shadow for a draft-mode read (emergency-shadow mode)', async () => {
        process.env.CMS_READ_FLIP = '-page';
        process.env.CMS_READ_SHADOW = '1';
        vi.mocked(getPage).mockResolvedValue(mockCmsPage({ id: 'p1', slug: 'about' }) as never);

        setDraftMode(true);
        const draftCapture = captureTransport();
        await PageApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'about' });
        await flushCmsShadows();
        expect(draftCapture.queries).toHaveLength(0);

        // Control: the same read with draft mode off DOES shadow, proving the
        // skip above is the draft flag and not a broken shadow harness.
        setDraftMode(false);
        const publishedCapture = captureTransport();
        await PageApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'about' });
        await flushCmsShadows();
        expect(publishedCapture.queries).toHaveLength(1);
    });
});
