import type { BannerSlice, BannerSliceAside, BannerSliceDefault } from '@/prismic/types';

export function bannerDefaultFixture(overrides: Partial<BannerSliceDefault['primary']> = {}): BannerSliceDefault {
    return {
        id: 'banner-default-fixture-id',
        slice_type: 'banner',
        slice_label: null,
        variation: 'default',
        primary: {
            content: [{ type: 'paragraph', text: 'Banner default content', spans: [] }],
            ...overrides,
        },
        items: [],
    } as unknown as BannerSliceDefault;
}

export function bannerAsideFixture(overrides: Partial<BannerSliceAside['primary']> = {}): BannerSliceAside {
    return {
        id: 'banner-aside-fixture-id',
        slice_type: 'banner',
        slice_label: null,
        variation: 'aside',
        primary: {
            content: [{ type: 'paragraph', text: 'Banner aside content', spans: [] }],
            background: { url: null, alt: null, copyright: null, dimensions: null },
            image: {
                url: 'https://images.prismic.io/test/image.jpg',
                alt: 'Test image',
                copyright: null,
                dimensions: { width: 800, height: 600 },
            },
            text_color: null,
            text_shadow: true,
            ...overrides,
        },
        items: [],
    } as unknown as BannerSliceAside;
}

export function bannerFixture(): BannerSlice {
    return bannerDefaultFixture() as unknown as BannerSlice;
}
