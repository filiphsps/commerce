import type { Access } from 'payload';

export type CmsUser = {
    role: 'admin' | 'editor';
    tenants?: Array<{ tenant: string }>;
};

export const isAdmin: Access<CmsUser> = ({ req }) => {
    return req?.user?.role === 'admin';
};
