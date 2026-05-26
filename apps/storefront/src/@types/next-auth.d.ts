import type { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: DefaultSession['user'] & {
            shopifyAccessToken?: string | undefined;
        };
    }

    interface User extends DefaultUser {
        shopifyAccessToken?: string | undefined;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        shopifyAccessToken?: string | undefined;
    }
}
