// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';

import { act, fireEvent, render } from '@/utils/test/react';

const { mockRefresh } = vi.hoisted(() => ({ mockRefresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }));

import { MediaMetadataForm } from './metadata-form';

/** The stored values a representative image row seeds the form with. */
const PROPS = {
    mediaId: 'kg7media1',
    alt: 'Hero artwork',
    caption: 'Original caption',
    isImage: true,
    focal: { x: 0.5, y: 0.5 },
} as const;

describe('<MediaMetadataForm> (POLISH-01 metadata edit flow)', () => {
    it('seeds the stored metadata and submits the edited values through the bound action', async () => {
        const updateAction = vi.fn<(formData: FormData) => Promise<{ id: string }>>(async () => ({
            id: PROPS.mediaId,
        }));
        const { getByLabelText, getByRole, findByRole } = render(
            <MediaMetadataForm {...PROPS} updateAction={updateAction} />,
        );

        const altInput = getByLabelText(/Alt text/) as HTMLInputElement;
        const captionInput = getByLabelText(/Caption/) as HTMLInputElement;
        const focalXInput = getByLabelText('X') as HTMLInputElement;
        expect(altInput.value).toBe('Hero artwork');
        expect(captionInput.value).toBe('Original caption');
        expect(focalXInput.value).toBe('0.5');

        fireEvent.change(altInput, { target: { value: 'Updated artwork' } });
        fireEvent.change(captionInput, { target: { value: '' } });
        fireEvent.change(focalXInput, { target: { value: '0.2' } });
        await act(async () => {
            fireEvent.submit(getByRole('form', { name: 'Edit metadata' }));
        });

        expect(updateAction).toHaveBeenCalledTimes(1);
        const formData = updateAction.mock.calls[0]?.[0];
        expect(formData).toBeInstanceOf(FormData);
        expect(formData?.get('mediaId')).toBe('kg7media1');
        expect(formData?.get('alt')).toBe('Updated artwork');
        // The emptied caption travels as an empty string — the server action's explicit clear.
        expect(formData?.get('caption')).toBe('');
        expect(formData?.get('focalX')).toBe('0.2');
        expect(formData?.get('focalY')).toBe('0.5');

        expect((await findByRole('status')).textContent).toBe('Saved.');
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('hides the focal inputs for non-image media (no focal point to edit)', () => {
        const { queryByLabelText } = render(
            <MediaMetadataForm
                {...PROPS}
                isImage={false}
                focal={null}
                updateAction={vi.fn(async () => ({ id: PROPS.mediaId }))}
            />,
        );
        expect(queryByLabelText('X')).toBeNull();
        expect(queryByLabelText('Y')).toBeNull();
    });

    it('surfaces an action failure inline instead of crashing the detail view', async () => {
        const updateAction = vi.fn(async () => {
            throw new Error('metadata update refused');
        });
        const { getByRole, findByRole } = render(<MediaMetadataForm {...PROPS} updateAction={updateAction} />);

        await act(async () => {
            fireEvent.submit(getByRole('form', { name: 'Edit metadata' }));
        });

        expect((await findByRole('alert')).textContent).toContain('metadata update refused');
    });
});
