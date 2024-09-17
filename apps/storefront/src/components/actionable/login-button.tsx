'use client';

import { FiLogIn } from 'react-icons/fi';

import { signIn } from 'next-auth/react';

import { Button } from '@/components/actionable/button';

export type LoginButtonProps = {};
export function LoginButton({}: LoginButtonProps) {
    return (
        <Button onClick={() => signIn('shopify')} styled={false}>
            <FiLogIn className="text-xl" />
        </Button>
    );
}
LoginButton.displayName = 'Nordcom.Actionable.LoginButton';
