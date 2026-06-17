import { describe, expect, it } from 'vitest';
import { Avatar, getInitials } from '@/components/informational/avatar';
import { render } from '@/utils/test/react';

describe('components', () => {
    describe('getInitials', () => {
        it('uses the first letter of a single-word name', () => {
            expect(getInitials('Madonna')).toBe('M');
        });

        it('caps multi-word names at first + last initial', () => {
            expect(getInitials('Mary Jane Watson')).toBe('MW');
        });

        it('collapses stray whitespace instead of emitting empty initials', () => {
            expect(getInitials('  John   Doe  ')).toBe('JD');
        });

        it('returns an empty string for a name with no word characters', () => {
            expect(getInitials('   ')).toBe('');
        });
    });

    describe('Avatar', () => {
        it('renders nothing when both src and name are absent', async () => {
            const wrapper = render(await Avatar({}));
            expect(wrapper.container).toBeEmptyDOMElement();
        });

        it('renders the derived initials when no image is provided', async () => {
            const wrapper = render(await Avatar({ name: 'Mary Jane Watson' }));
            expect(wrapper.container.textContent).toBe('MW');
        });

        it('does not leak the wrapper className onto the inner image', async () => {
            const wrapper = render(
                await Avatar({ src: 'https://example.test/a.png', name: 'Ada', className: 'size-4' }),
            );
            const img = wrapper.container.querySelector('img');
            expect(img).not.toBeNull();
            expect(img?.className).not.toMatch(/size-4/);
        });
    });
});
