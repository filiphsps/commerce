import { describe, expect, it } from 'vitest';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { render, screen } from '@/utils/test/react';

describe('Command', () => {
    it('renders an input and list', () => {
        render(
            <Command>
                <CommandInput placeholder="Search…" />
                <CommandList>
                    <CommandEmpty>No results.</CommandEmpty>
                    <CommandItem>Apple</CommandItem>
                </CommandList>
            </Command>,
        );
        expect(screen.getByPlaceholderText('Search…')).toBeInTheDocument();
        expect(screen.getByText('Apple')).toBeInTheDocument();
    });
});
