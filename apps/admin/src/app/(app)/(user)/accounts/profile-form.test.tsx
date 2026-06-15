import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { saveAccountName, toastSuccess, toastError } = vi.hoisted(() => ({
    saveAccountName: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
}));

vi.mock('./actions', () => ({ saveAccountName }));
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }));

import { ProfileForm } from './profile-form';

describe('ProfileForm', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.resetAllMocks());

    it('disables Save until the name is dirty, then persists and toasts', async () => {
        saveAccountName.mockResolvedValue({ ok: true, account: { name: 'Edited' } });
        const { getByLabelText, getByRole } = render(<ProfileForm initialName="Original" />);
        const save = getByRole('button', { name: /save/i });
        expect(save).toBeDisabled();

        fireEvent.change(getByLabelText(/display name/i), { target: { value: 'Edited' } });
        expect(save).not.toBeDisabled();

        await act(async () => {
            fireEvent.submit(save.closest('form') as HTMLFormElement);
        });
        expect(saveAccountName).toHaveBeenCalledWith('Edited');
        expect(toastSuccess).toHaveBeenCalled();
    });

    it('toasts the error and stays dirty on failure', async () => {
        saveAccountName.mockResolvedValue({ ok: false, error: 'too long' });
        const { getByLabelText, getByRole } = render(<ProfileForm initialName="Original" />);
        fireEvent.change(getByLabelText(/display name/i), { target: { value: 'Bad' } });
        await act(async () => {
            fireEvent.submit(getByRole('button', { name: /save/i }).closest('form') as HTMLFormElement);
        });
        expect(toastError).toHaveBeenCalledWith('too long');
    });
});
