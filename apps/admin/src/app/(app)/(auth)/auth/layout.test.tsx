import { within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRSC } from '@/utils/test/rsc';
import AuthLayout, { metadata } from './layout';

describe('(auth)/auth/layout', () => {
    it('passes children through without adding chrome', async () => {
        const { container } = await renderRSC(() => AuthLayout({ children: <span>auth child</span> }));
        const q = within(container as HTMLElement);
        expect(q.getByText('auth child')).toBeInTheDocument();
        // No constraining card wrapper — the screens own their own chrome.
        expect(container.querySelector('section, article, [class*="card"]')).toBeNull();
    });

    it('exports the shared title template', () => {
        const title = (metadata as { title?: { default?: string; template?: string } }).title;
        expect(title?.default).toBe('Account');
        expect(title?.template).toBe('%s · Nordcom Commerce');
    });
});
