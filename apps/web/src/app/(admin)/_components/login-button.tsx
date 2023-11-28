'use client';

import styles from '#/components/login-button.module.scss';
import type { AuthProvider } from '#/utils/auth';
import { UnknownApiError } from '@/utils/errors';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, type HTMLProps } from 'react';
import { toast } from 'sonner';

export type LoginButtonProps = {
    provider?: AuthProvider;
} & Omit<HTMLProps<HTMLButtonElement>, 'type' | 'onClick'>;
export default function LoginButton({ provider = 'github', className, ...props }: LoginButtonProps) {
    const [loading, setLoading] = useState<boolean>(false);

    // Get error message added by next/auth in URL.
    const searchParams = useSearchParams();
    const error = searchParams?.get('error');

    useEffect(() => {
        const errorMessage = Array.isArray(error) ? error.pop() : error;
        if (!errorMessage) return;

        console.error(errorMessage);
        toast.error(errorMessage);
    }, [error]);

    let layout = <></>;
    switch (provider) {
        case 'github': {
            layout = <p>Login with GitHub</p>;
            break;
        }
        default: {
            throw new UnknownApiError();
        }
    }

    return (
        <button
            {...props}
            onClick={() => {
                if (loading) {
                    toast.error('Please wait for the current request to finish.');
                    return;
                }

                switch (provider) {
                    case 'github': {
                        setLoading(true);
                        signIn('github');
                        break;
                    }
                    default: {
                        throw new UnknownApiError();
                    }
                }
            }}
            type="button"
            disabled={loading}
            className={`${styles.container} ${loading ? styles.loading : ''} ${className || ''}`}
        >
            {!loading ? layout : <p>Loading...</p>}
        </button>
    );
}
