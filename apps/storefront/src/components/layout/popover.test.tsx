import { describe, expect, it, vi } from 'vitest';
import { Popover } from '@/components/layout/popover';
import { fireEvent, render, screen } from '@/utils/test/react';

describe('components', () => {
    describe('Popover', () => {
        it('renders children when open is true', () => {
            render(
                <Popover open={true} onOpenChange={() => {}} title="Pick an option">
                    <div>popover body</div>
                </Popover>,
            );
            expect(screen.getByText('popover body')).toBeInTheDocument();
        });

        it('renders nothing visible when open is false', () => {
            render(
                <Popover open={false} onOpenChange={() => {}} title="Pick an option">
                    <div>popover body</div>
                </Popover>,
            );
            expect(screen.queryByText('popover body')).not.toBeInTheDocument();
        });

        it('calls onOpenChange(false) when the close button is clicked', () => {
            const onOpenChange = vi.fn();
            render(
                <Popover open={true} onOpenChange={onOpenChange} title="Pick an option">
                    <div>popover body</div>
                </Popover>,
            );
            fireEvent.click(screen.getByRole('button', { name: /close/i }));
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });
});
