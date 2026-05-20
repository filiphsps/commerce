import { describe, expect, it } from 'vitest';
import { Kbd } from '@/components/ui/kbd';
import { render, screen } from '@/utils/test/react';

describe('Kbd', () => {
    it('renders shortcut keys', () => {
        render(<Kbd>⌘K</Kbd>);
        expect(screen.getByText('⌘K')).toBeInTheDocument();
    });
});
