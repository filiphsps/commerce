import { getArticle } from '@nordcom/commerce-cms/api';
import { describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockArticle, mockShop } from '@/utils/test/fixtures';
import { ArticleApi } from './article';

vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getArticle: vi.fn() };
});

describe('ArticleApi', () => {
    it('forwards slug, shop, locale', async () => {
        vi.mocked(getArticle).mockResolvedValue(mockArticle());
        await ArticleApi({ shop: mockShop(), locale: Locale.from('en-US'), slug: 'launch-news' });
        expect(getArticle).toHaveBeenCalledWith({
            shop: { id: 'mock-shop-id', domain: 'staging.storefront.localhost', i18n: { defaultLocale: 'en-US' } },
            locale: { code: 'en-US' },
            slug: 'launch-news',
        });
    });

    it('returns null when no CMS article matches the slug (overlay-only design)', async () => {
        vi.mocked(getArticle).mockResolvedValue(null as never);
        const result = await ArticleApi({ shop: mockShop(), locale: Locale.from('en-US'), slug: 'absent' });
        expect(result).toBeNull();
    });
});
