'use client';

import { useEffect, useRef, useTransition } from 'react';
import { toast } from 'sonner';

import { useTheme } from '@/components/theme/theme-provider';
import { cn } from '@/utils/tailwind';
import type { ThemePreference } from '@/utils/theme';

import { saveThemePreference } from './actions';

const OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
    { value: 'system', label: 'System' },
    { value: 'dark', label: 'Dark' },
];

/**
 * Segmented Dark/System control for the operator's theme preference. Applies the choice instantly via
 * the shell {@link useTheme} provider (cookie + `<html data-theme>`) and persists it durably via the
 * `saveThemePreference` server action; a failed save reverts the selection and toasts. On mount it
 * reconciles the provider with the server-authoritative `initialTheme` so the choice follows the
 * operator across devices.
 *
 * @param props.initialTheme - The server-persisted preference (from the user record).
 * @returns The segmented control.
 */
export function ThemeToggle({ initialTheme }: { initialTheme: ThemePreference }) {
    const { preference, setPreference } = useTheme();
    const [pending, startTransition] = useTransition();
    const reconciled = useRef(false);

    useEffect(() => {
        if (reconciled.current) {
            return;
        }
        reconciled.current = true;
        if (initialTheme !== preference) {
            setPreference(initialTheme);
        }
    }, [initialTheme, preference, setPreference]);

    function choose(value: ThemePreference) {
        if (value === preference || pending) {
            return;
        }
        const previous = preference;
        setPreference(value);
        startTransition(async () => {
            const result = await saveThemePreference(value);
            if (!result.ok) {
                setPreference(previous);
                toast.error('Could not save theme preference.');
            }
        });
    }

    return (
        <div
            role="radiogroup"
            aria-label="Theme"
            className="inline-flex rounded-md border-2 border-border bg-background p-1"
        >
            {OPTIONS.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={preference === option.value}
                    disabled={pending}
                    onClick={() => choose(option.value)}
                    className={cn(
                        'rounded px-4 py-1.5 font-bold text-xs uppercase tracking-wide transition-colors',
                        preference === option.value
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
