'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';

import { saveAccountName } from './actions';

/** Mirror of the Convex seam's name bound, so the field guards before a round-trip. */
const NAME_MAX_LENGTH = 120;

/**
 * Editable display-name form. The Save button is gated on a non-empty, changed value; submit calls the
 * `saveAccountName` server action and toasts the outcome. The Convex seam remains the source of truth
 * for validation — this only short-circuits the obvious empty case.
 *
 * @param props.initialName - The operator's current display name.
 * @returns The profile form.
 */
export function ProfileForm({ initialName }: { initialName: string }) {
    const [name, setName] = useState(initialName);
    const [saved, setSaved] = useState(initialName);
    const [pending, startTransition] = useTransition();

    const trimmed = name.trim();
    const dirty = trimmed.length > 0 && trimmed !== saved.trim();

    function submit() {
        if (!dirty || pending) {
            return;
        }
        startTransition(async () => {
            const result = await saveAccountName(trimmed);
            if (result.ok) {
                setSaved(result.account.name);
                setName(result.account.name);
                toast.success('Profile updated.');
            } else {
                toast.error(result.error || 'Could not update profile.');
            }
        });
    }

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
            className="flex flex-col gap-4"
        >
            <TextField
                label="Display name"
                value={name}
                onChange={setName}
                maxLength={NAME_MAX_LENGTH}
                autoComplete="name"
                required={true}
            />
            <div className="flex justify-end">
                <Button type="submit" disabled={!dirty || pending}>
                    {pending ? 'Saving…' : 'Save'}
                </Button>
            </div>
        </form>
    );
}
