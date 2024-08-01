'use client';

import { useEffect } from 'react';

import { signOut } from 'next-auth/react';

export const LogoutAction = ({}) => {
    useEffect(() => {
        signOut({ callbackUrl: '/' });
    }, []);

    return null;
};
