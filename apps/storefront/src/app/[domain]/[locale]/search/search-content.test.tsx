import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchBar } from './search-content';

const locale = { code: 'en-US' } as never;
const i18n = {} as never;

describe('SearchBar input keys', () => {
    it('does not preventDefault on non-Enter keys', () => {
        const onSearch = vi.fn();
        const { getByRole } = render(<SearchBar locale={locale} i18n={i18n} onSearch={onSearch} />);
        const input = getByRole('searchbox') as HTMLInputElement;

        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true, bubbles: true });
        const preventDefault = vi.spyOn(event, 'preventDefault');

        input.dispatchEvent(event);

        expect(preventDefault).not.toHaveBeenCalled();
    });

    it('calls onSearch on Enter', () => {
        const onSearch = vi.fn();
        const { getByRole } = render(<SearchBar locale={locale} i18n={i18n} onSearch={onSearch} />);
        const input = getByRole('searchbox') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'red shoes' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(onSearch).toHaveBeenCalledWith('red shoes');
    });
});
