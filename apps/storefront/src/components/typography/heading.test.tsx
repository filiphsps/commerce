import { describe, expect, it, vi } from 'vitest';

import { render } from '@/utils/test/react';

import Heading from '@/components/typography/heading';

describe('components', () => {
    describe('Heading', () => {
        vi.mock('@shopify/hydrogen-react', async () => {
            return {
                ...((await vi.importActual('@shopify/hydrogen-react')) || {}),
                useCart: vi.fn().mockReturnValue({
                    status: 'idle'
                }),
                useShop: vi.fn().mockReturnValue({}),
                useShopifyCookies: vi.fn().mockReturnValue({})
            };
        });

        it('should render a title and subtitle', () => {
            const title = 'This is the title';
            const subtitle = 'This is the subtitle';
            const { getByText, unmount } = render(<Heading title={title} subtitle={subtitle} />);
            expect(getByText(title).innerText).toBe(title);
            expect(getByText(subtitle).innerText).toBe(subtitle);
            expect(() => unmount()).not.toThrow();
        });

        it.todo('should render the title and subtitle in reverse order if reverse prop is true');

        it('should render the title and subtitle in bold if bold prop is true', () => {
            const title = 'This is the title';
            const subtitle = 'This is the subtitle';
            const { getByText } = render(<Heading title={title} subtitle={subtitle} bold />);
            expect(getByText(title).className).toContain('bold');
            expect(getByText(subtitle).className).toContain('bold');
        });

        it('should render the title and subtitle with the specified element type if titleAs and subtitleAs props are provided', () => {
            const title = 'This is the title';
            const subtitle = 'This is the subtitle';
            const { getByTestId } = render(
                <div data-testid="heading">
                    <Heading title={title} subtitle={subtitle} titleAs="h2" subtitleAs="h3" />
                </div>
            );

            const h2 = getByTestId('heading').querySelector('h2');
            const h3 = getByTestId('heading').querySelector('h3');
            expect(h2).toBeDefined();
            expect(h2?.nodeName).toBe('H2');
            expect(h3).toBeDefined();
            expect(h3?.nodeName).toBe('H3');
        });

        it('should render the title and subtitle with the specified styles if titleStyle and subtitleStyle props are provided', () => {
            const title = 'This is the title';
            const subtitle = 'This is the subtitle';
            const { getByText } = render(
                <Heading
                    title={title}
                    subtitle={subtitle}
                    titleStyle={{ color: 'rgb(255, 0, 0)' }}
                    subtitleStyle={{ color: 'rgb(0, 0, 255)' }}
                />
            );
            expect(getByText(title).style.cssText).toBe('color: rgb(255, 0, 0);');
            expect(getByText(subtitle).style.cssText).toBe('color: rgb(0, 0, 255);');
        });

        it('should render the title and subtitle with the specified class names if titleClassName and subtitleClassName props are provided', () => {
            const title = 'This is the title';
            const subtitle = 'This is the subtitle';
            const { getByText } = render(
                <Heading
                    title={title}
                    subtitle={subtitle}
                    titleClassName="title-class"
                    subtitleClassName="subtitle-class"
                />
            );
            expect(getByText(title).className).toContain('title-class');
            expect(getByText(subtitle).className).toContain('subtitle-class');
        });
    });
});
