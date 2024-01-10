'use client';

import styles from '#/components/login-button.module.scss';
import type { AuthProvider } from '#/utils/auth';
import GithubLight from '@/static/github-light.svg';
import { UnknownApiError } from '@nordcom/commerce-errors';
import { Button } from '@nordcom/nordstar';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState, type HTMLProps } from 'react';
import { toast } from 'sonner';

export type LoginButtonProps = {
    provider?: AuthProvider;
} & Omit<HTMLProps<HTMLButtonElement>, 'type' | 'onClick'>;
export default function LoginButton({ provider = 'github', className, ...props }: LoginButtonProps) {
    const [loading, setLoading] = useState<boolean>(false);

    // Get error message added by next/auth in URL.
    const router = useRouter();
    const path = usePathname();
    const searchParams = useSearchParams();
    const error = searchParams?.get('error');

    useEffect(() => {
        const errorMessage = Array.isArray(error) ? error.pop() : error;
        if (!errorMessage) return;

        console.error(errorMessage);
        toast.error(errorMessage);

        const params = new URLSearchParams(searchParams);

        // Delete error message from URL.
        params.delete('error');
        params.delete('callbackUrl');

        router.replace(`${path}${params.size > 0 ? '?' : ''}${params.toString()}`);
    }, [error]);

    let layout: ReactNode = <></>;
    let icon: ReactNode = <></>;
    switch (provider) {
        case 'github': {
            layout = 'Login with GitHub';
            icon = <Image className={styles['provider-logo']} src={GithubLight} alt="GitHub" />;
            break;
        }
        default: {
            throw new UnknownApiError();
        }
    }

    return (
        <Button
            {...props}
            color="default"
            variant="outline"
            onClick={() => {
                if (loading) {
                    toast.error('Please wait for the current request to finish.');
                    return;
                }

                switch (provider) {
                    case 'github': {
                        setLoading(true);
                        signIn('github', { callbackUrl: '/admin/shop/' });
                        break;
                    }
                    default: {
                        throw new UnknownApiError();
                    }
                }
            }}
            type="button"
            as="button"
            disabled={loading}
            className={`${styles.container} ${loading ? styles.loading : ''} ${className || ''}`}
            icon={icon}
        >
            {!loading ? layout : <p>Loading...</p>}
        </Button>
    );
}
