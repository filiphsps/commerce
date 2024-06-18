import GitHub from 'next-auth/providers/github';

import type { NextAuthConfig } from 'next-auth';

export default {
    providers: [
        GitHub({
            clientId: process.env.GITHUB_ID as string,
            clientSecret: process.env.GITHUB_TOKEN as string,

            profile({ id, name, email, login, avatar_url }) {
                return {
                    id: id.toString(),
                    name: name,
                    email: email || login,
                    image: avatar_url
                };
            }
        })
    ],
    secret: process.env.AUTH_SECRET,
    debug: false
} satisfies NextAuthConfig;
