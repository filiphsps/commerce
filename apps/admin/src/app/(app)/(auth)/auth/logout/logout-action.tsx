'use client';

import { signOut } from 'next-auth/react';
import { useEffect } from 'react';

/**
 * Client component that triggers a NextAuth sign-out on mount and redirects to the app root.
 */
export const LogoutAction = ({}) => {
    useEffect(() => {
        signOut({ callbackUrl: '/' });
    }, []);

    return null;
};
