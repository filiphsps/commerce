import { describe, expect, it } from 'vitest';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { render, screen } from '@/utils/test/react';

describe('Tooltip', () => {
    it('renders trigger', () => {
        render(
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>Hover me</TooltipTrigger>
                    <TooltipContent>Helpful</TooltipContent>
                </Tooltip>
            </TooltipProvider>,
        );
        expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
    });
});
