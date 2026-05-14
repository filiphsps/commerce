'use client';
import { ConfigProvider } from '@payloadcms/ui';
import type { ClientConfig } from 'payload';
import type { ReactNode } from 'react';

export type PayloadFieldShellProps = {
    config: ClientConfig;
    children: ReactNode;
};

export function PayloadFieldShell({ config, children }: PayloadFieldShellProps) {
    return <ConfigProvider config={config}>{children}</ConfigProvider>;
}
