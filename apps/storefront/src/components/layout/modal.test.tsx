import { describe, expect, it } from 'vitest';

import { render, waitFor } from '@/utils/test/react';

import { Modal } from '@/components/layout/modal';

describe('components', () => {
    describe('Modal', () => {
        it.todo('renders without errors', async () => {
            const { unmount } = render(
                await Modal({
                    title: 'Test',
                    description: 'Test',
                    i18n: {} as any,
                    children: <div>Test</div>
                })
            );

            await waitFor(() => expect(unmount).not.toThrow());
        });
    });
});
