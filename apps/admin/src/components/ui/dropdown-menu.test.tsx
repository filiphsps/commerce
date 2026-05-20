import { describe, expect, it } from 'vitest';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { render, screen } from '@/utils/test/react';

describe('DropdownMenu', () => {
    it('renders trigger and exposes items when open', () => {
        render(
            <DropdownMenu defaultOpen>
                <DropdownMenuTrigger>Open</DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem>One</DropdownMenuItem>
                    <DropdownMenuItem>Two</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>,
        );
        expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'One' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Two' })).toBeInTheDocument();
    });
});
