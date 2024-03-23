import { SessionProvider } from 'next-auth/react';

import { View } from '@nordcom/nordstar';

import { auth } from '@/utils/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    return (
        <SessionProvider session={session}>
            <View>{children}</View>
        </SessionProvider>
    );
}
