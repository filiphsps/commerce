import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/actionable/button';
import { render } from '@/utils/test/react';

vi.mock('@shopify/hydrogen-react', async () => {
    return {
        useShop: vi.fn().mockReturnValue({}),
        useShopifyCookies: vi.fn().mockReturnValue({}),
    };
});

describe('components', () => {
    describe('Button', () => {
        it('should render without crashing', () => {
            const wrapper = render(<Button>Hello Button</Button>);

            expect(() => wrapper.unmount()).not.toThrow();
        });

        it('applies the tokenized primary chassis and focus ring by default', () => {
            const { getByRole } = render(<Button>Buy</Button>);
            const button = getByRole('button');

            expect(button.className).toContain('bg-primary');
            expect(button.className).toContain('text-primary-foreground');
            expect(button.className).toContain('focus-ring');
        });

        it('drives the destructive variant from the --state-danger token', () => {
            const { getByRole } = render(<Button variant="destructive">Remove</Button>);

            expect(getByRole('button').className).toContain('--state-danger');
        });

        it('renders the secondary surface variant from semantic tokens', () => {
            const { getByRole } = render(<Button variant="secondary">More</Button>);
            const className = getByRole('button').className;

            expect(className).toContain('bg-(--surface-1)');
            expect(className).toContain('--text');
            expect(className).not.toContain('bg-primary');
        });

        it('omits the chassis entirely when styled is false', () => {
            const { getByRole } = render(
                <Button styled={false} variant="primary">
                    Bare
                </Button>,
            );
            const className = getByRole('button').className;

            expect(className).toContain('appearance-none');
            expect(className).not.toContain('bg-primary');
            expect(className).not.toContain('focus-ring');
        });

        it('exposes an accessible name for icon-only controls via aria-label', () => {
            const { getByRole } = render(
                <Button type="button" variant="destructive" aria-label="Remove item">
                    <svg aria-hidden={true} />
                </Button>,
            );

            expect(getByRole('button', { name: 'Remove item' })).toBeInTheDocument();
        });
    });
});
