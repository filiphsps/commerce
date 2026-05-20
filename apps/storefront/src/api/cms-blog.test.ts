import { getArticles } from '@nordcom/commerce-cms/api';
import { draftMode } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockArticle, mockShop } from '@/utils/test/fixtures';
import { BlogApi } from './cms-blog';

vi.mock('next/headers', () => ({ draftMode: vi.fn() }));
vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getArticles: vi.fn() };
});

describe('BlogApi', () => {
    beforeEach(() => {
        vi.mocked(draftMode).mockResolvedValue({ isEnabled: false } as never);
    });

    it('forwards page + limit + tag args', async () => {
        vi.mocked(getArticles).mockResolvedValue({ docs: [mockArticle()] } as never);
        await BlogApi({ shop: mockShop(), locale: Locale.from('en-US'), page: 2, limit: 10, tag: 'news' });
        expect(getArticles).toHaveBeenCalledWith(
            expect.objectContaining({
                shop: { id: 'mock-shop-id', domain: 'staging.storefront.localhost', i18n: { defaultLocale: 'en-US' } },
                locale: { code: 'en-US' },
                page: 2,
                limit: 10,
                tag: 'news',
                draft: false,
            }),
        );
    });

    it('defaults page to 1 and limit to 12', async () => {
        vi.mocked(getArticles).mockResolvedValue({ docs: [] } as never);
        await BlogApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(getArticles).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 12 }));
    });
});
