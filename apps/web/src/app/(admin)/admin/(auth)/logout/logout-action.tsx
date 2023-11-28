'use client';

import { signOut } from 'next-auth/react';
import { useEffect } from 'react';

export const LogoutAction = ({}) => {
    useEffect(() => {
        signOut({ callbackUrl: '/' });
    }, []);

    return null;
};
