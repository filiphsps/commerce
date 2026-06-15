import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { THEME_COOKIE } from '@/utils/theme';

import { ThemeScript } from './theme-script';

describe('ThemeScript', () => {
    it('emits a pre-paint script that reads the cookie and sets data-theme', () => {
        const { container } = render(<ThemeScript />);
        const script = container.querySelector('script');
        expect(script).not.toBeNull();
        const source = script?.innerHTML ?? '';
        expect(source).toContain(THEME_COOKIE);
        expect(source).toContain('prefers-color-scheme: light');
        expect(source).toContain('dataset.theme');
    });
});
