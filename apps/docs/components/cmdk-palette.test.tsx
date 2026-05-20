import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CmdkPalette } from './cmdk-palette';

describe('<CmdkPalette />', () => {
    it('opens on Cmd+K and renders the search input', () => {
        const { baseElement } = render(<CmdkPalette />);
        fireEvent.keyDown(window, { key: 'k', metaKey: true });
        // Dialog renders into a Radix portal, so we query baseElement (the document body).
        expect(baseElement.querySelector('input[placeholder*="Search"]')).toBeTruthy();
    });

    it('opens on Ctrl+K (non-mac shortcut)', () => {
        const { baseElement } = render(<CmdkPalette />);
        fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
        expect(baseElement.querySelector('input[placeholder*="Search"]')).toBeTruthy();
    });

    it('renders nothing in the initial closed state', () => {
        const { container } = render(<CmdkPalette />);
        expect(container.querySelector('input')).toBeFalsy();
    });
});
