type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export function mockPage(overrides: DeepPartial<any> = {}) {
    return {
        id: 'gid://shopify/Page/1',
        handle: 'demo-page',
        title: 'Demo Page',
        body: '<p>Page body.</p>',
        bodySummary: 'Page body.',
        seo: { title: 'Demo Page', description: 'Demo description.' },
        ...overrides,
    };
}
