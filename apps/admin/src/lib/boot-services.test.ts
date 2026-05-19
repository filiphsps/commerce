import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setPayloadMocks = {
    shop: vi.fn(),
    review: vi.fn(),
    featureFlag: vi.fn(),
};

vi.mock('@nordcom/commerce-db', () => ({
    Shop: { setPayload: setPayloadMocks.shop },
    Review: { setPayload: setPayloadMocks.review },
    FeatureFlag: { setPayload: setPayloadMocks.featureFlag },
}));

const fakePayload = { __fake: true } as const;
const getPayloadMock = vi.fn().mockResolvedValue(fakePayload);
vi.mock('payload', () => ({ getPayload: getPayloadMock }));

vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }));

describe('admin bootServices', () => {
    beforeEach(() => {
        setPayloadMocks.shop.mockClear();
        setPayloadMocks.review.mockClear();
        setPayloadMocks.featureFlag.mockClear();
        getPayloadMock.mockClear();
        vi.resetModules();
    });

    afterEach(() => {
        vi.resetModules();
    });

    it('boots Payload once and injects it into Shop, Review, FeatureFlag', async () => {
        const { bootServices } = await import('./boot-services');
        await bootServices();

        expect(getPayloadMock).toHaveBeenCalledTimes(1);
        expect(setPayloadMocks.shop).toHaveBeenCalledWith(fakePayload);
        expect(setPayloadMocks.review).toHaveBeenCalledWith(fakePayload);
        expect(setPayloadMocks.featureFlag).toHaveBeenCalledWith(fakePayload);
    });

    it('is idempotent — the second call reuses the cached promise', async () => {
        const { bootServices } = await import('./boot-services');
        await bootServices();
        await bootServices();

        expect(getPayloadMock).toHaveBeenCalledTimes(1);
        expect(setPayloadMocks.shop).toHaveBeenCalledTimes(1);
    });
});
