import { describe, expect, it, vi } from 'vitest';
import { render } from '@/utils/test/react';
import CollectionBlockArrows from './collection-block-arrows';

class MockObserver {
    callback: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) {
        this.callback = cb;
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = (): IntersectionObserverEntry[] => [];
    root = null;
    rootMargin = '';
    thresholds = [];
}

describe('components', () => {
    describe('CollectionBlockArrows', () => {
        it('renders both arrow buttons', () => {
            (globalThis as never as { IntersectionObserver: typeof MockObserver }).IntersectionObserver = MockObserver;
            const { container } = render(
                <div>
                    <div data-testid="rail">
                        <span>first</span>
                        <span>last</span>
                    </div>
                    <CollectionBlockArrows railSelector="[data-testid='rail']" />
                </div>,
            );
            expect(container.querySelector('[aria-label="Previous"]')).not.toBeNull();
            expect(container.querySelector('[aria-label="Next"]')).not.toBeNull();
        });

        it('renders arrows with the expected sides', () => {
            (globalThis as never as { IntersectionObserver: typeof MockObserver }).IntersectionObserver = MockObserver;
            const { container } = render(
                <div>
                    <div data-testid="rail">
                        <span>only</span>
                    </div>
                    <CollectionBlockArrows railSelector="[data-testid='rail']" />
                </div>,
            );
            expect(container.querySelector('[data-side="prev"]')).not.toBeNull();
            expect(container.querySelector('[data-side="next"]')).not.toBeNull();
        });
    });
});
