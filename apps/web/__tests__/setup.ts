import 'next';

import * as matchers from '@testing-library/jest-dom/matchers';

import { expect, vi } from 'vitest';

expect.extend(matchers);

// Mock the `server-only` module as it doesn't work with vitest.
vi.mock('server-only', () => {
    return {};
});

// Mock the `build-config` module as it almost only contains tokens,
// secrets, and other sensitive data (excluding the i18n config which
// should be handled dynamically by the platform in the future).
vi.mock('@/utils/build-config', () => ({
    BuildConfig: {
        i18n: {
            default: 'en-US',
            currencies: ['USD']
        }
    }
}));

// Mock the `prismic` module as it requires a valid Prismic repository,
// which we don't have in our tests. It's up to pirsmic to test their
// service, not us. We would only cause unnecessary conflicts and
// errors by trying to include it in our tests.
vi.mock('@/prismic', () => ({
    createClient: vi.fn().mockReturnValue({
        getSingle: vi.fn().mockResolvedValue({
            data: {}
        })
    })
}));

// Thanks to https://github.com/akiran/react-slick/issues/742#issuecomment-298992238
window.matchMedia =
    window.matchMedia ||
    function () {
        return {
            matches: false,
            addListener: function () {},
            removeListener: function () {}
        };
    };
