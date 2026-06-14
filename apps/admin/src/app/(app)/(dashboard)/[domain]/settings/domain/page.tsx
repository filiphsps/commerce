import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import type { Metadata } from 'next';

import { getVercelConfig } from '@/lib/domains/config';
import { buildRecordInstructions } from '@/lib/domains/targets';
import { verifyDomain } from './actions';
import { ConnectPanel } from './connect-panel';

export const metadata: Metadata = { title: 'Domain' };

type Props = { params: Promise<{ domain: string }> };

/**
 * Settings → Domain page: shows the DNS records to point a shop's customer-facing domain at the
 * platform and a live verify panel. Server-reads the current connection status; the records reflect
 * whether the deployment can provision on Vercel or only supports the `SERVICE_DOMAIN` CNAME path.
 *
 * @param props - Route params carrying `[domain]`.
 * @returns The domain settings page.
 */
export default async function DomainSettingsPage({ params }: Props): Promise<React.JSX.Element> {
    const { domain } = await params;
    const verification = await Shop.getDomainVerification(domain);
    const serviceDomain = process.env.SERVICE_DOMAIN ?? '';
    const records = buildRecordInstructions({ hasVercel: getVercelConfig() !== null, serviceDomain });

    return (
        <main className="flex flex-col gap-6 p-6">
            <header className="flex flex-col gap-1">
                <h1 className="font-bold text-2xl">Domain</h1>
                <p className="text-muted-foreground">Connect {domain} to your storefront.</p>
            </header>
            <ConnectPanel
                domain={domain}
                initialStatus={verification?.status ?? 'pending'}
                records={records}
                verifyAction={verifyDomain}
            />
        </main>
    );
}
