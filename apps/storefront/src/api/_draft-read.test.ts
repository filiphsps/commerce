import { draftMode } from 'next/headers';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockShop } from '@/utils/test/fixtures';
import { __setCmsReadQuery } from './_cms-read';
import { isDraftModeEnabled } from './_draft';
import { PageApi } from './page';

vi.mock('next/headers', () => ({ draftMode: vi.fn() }));

/** Points `draftMode()` at a fixed enabled/disabled state for one test. */
function setDraftMode(isEnabled: boolean): void {
    vi.mocked(draftMode).mockResolvedValue({ isEnabled } as Awaited<ReturnType<typeof draftMode>>);
}

/** Installs a capturing read transport and returns its call log. */
function captureQuery(): { queries: Array<{ name: string; args: Record<string, unknown> }> } {
    const queries: Array<{ name: string; args: Record<string, unknown> }> = [];
    __setCmsReadQuery((name, args) => {
        queries.push({ name, args });
        return Promise.resolve(null);
    });
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
    afterEach(() => {
        __setCmsReadQuery(null);
        vi.mocked(draftMode).mockReset();
    });

    it('serves the Convex draft read (draft: true arg) when draft mode is on', async () => {
        setDraftMode(true);
        const { queries } = captureQuery();

        await PageApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'about' });
        expect(queries).toHaveLength(1);
        expect(queries[0]).toMatchObject({
            name: 'cms/read:pageBySlug',
            args: { slug: 'about', locale: 'en-US', draft: true },
        });
    });

    it('omits the draft arg from the Convex read outside draft mode', async () => {
        setDraftMode(false);
        const { queries } = captureQuery();

        await PageApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'about' });
        expect(queries[0]?.args).not.toHaveProperty('draft');
    });
});
