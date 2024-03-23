import 'server-only';

import styles from '@/components/login-button.module.scss';

import Image from 'next/image';

import { UnknownApiError } from '@nordcom/commerce-errors';
import { Button } from '@nordcom/nordstar';

import GithubLight from '@/static/icons/light/github.svg';
import { signIn } from '@/utils/auth';

import type { AuthProvider } from '@/utils/auth';
import type { HTMLProps, ReactNode } from 'react';

export type LoginButtonProps = {
    provider?: AuthProvider['name'];
} & Omit<HTMLProps<HTMLButtonElement>, 'type' | 'onClick'>;
export default async function LoginButton({ provider = 'github', className, ...props }: LoginButtonProps) {
    let content: string;
    let icon: ReactNode = <></>;

    switch (provider) {
        case 'github': {
            content = 'Login with GitHub';
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
            onClick={async () => {
                'use server';

                await signIn(provider, {
                    redirectTo: '/'
                });
            }}
            type="button"
            as="button"
            className={`${styles.container} ${className || ''}`}
            icon={icon}
        >
            {content}
        </Button>
    );
}
