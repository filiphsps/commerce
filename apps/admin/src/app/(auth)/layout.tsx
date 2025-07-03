import { View } from '@nordcom/nordstar';

import type { ReactNode } from 'react';

export default async function AuthLayout({ children }: { children: ReactNode }) {
    return <View>{children as any}</View>;
}
