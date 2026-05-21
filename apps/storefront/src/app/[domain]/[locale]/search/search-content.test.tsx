import { createEvent, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { SearchBar } from './search-content';

const locale = Locale.from('en-US')!;
const i18n = {} as never;

describe('SearchBar input keys', () => {
    it('does not call onSearch on non-Enter keys', () => {
        const onSearch = vi.fn();
        const { getByRole } = render(<SearchBar locale={locale} i18n={i18n} onSearch={onSearch} />);
        const input = getByRole('searchbox') as HTMLInputElement;

        fireEvent.keyDown(input, { key: 'ArrowLeft' });

        expect(onSearch).not.toHaveBeenCalled();
    });

    it('does not preventDefault on non-Enter keys', () => {
        const onSearch = vi.fn();
        const { getByRole } = render(<SearchBar locale={locale} i18n={i18n} onSearch={onSearch} />);
        const input = getByRole('searchbox') as HTMLInputElement;

        const event = createEvent.keyDown(input, { key: 'ArrowLeft' });
        fireEvent(input, event);

        expect(event.defaultPrevented).toBe(false);
    });

    it('calls onSearch on Enter', () => {
        const onSearch = vi.fn();
        const { getByRole } = render(<SearchBar locale={locale} i18n={i18n} onSearch={onSearch} />);
        const input = getByRole('searchbox') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'red shoes' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(onSearch).toHaveBeenCalledWith('red shoes');
    });

    it('does not call onSearch when Enter is pressed during IME composition', () => {
        const onSearch = vi.fn();
        const { getByRole } = render(<SearchBar locale={locale} i18n={i18n} onSearch={onSearch} />);
        const input = getByRole('searchbox') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '日本語' } });

        const event = createEvent.keyDown(input, { key: 'Enter', isComposing: true });
        fireEvent(input, event);

        expect(onSearch).not.toHaveBeenCalled();
    });
});
