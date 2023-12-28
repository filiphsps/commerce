'use client';

import { Card, Label } from '@nordcom/nordstar';
import { CommerceProviderType, type CommerceProvider } from '@prisma/client/edge';
import { useState } from 'react';
import styles from './settings.module.scss';

export type CommerceSettingsProps = {
    data: CommerceProvider | null;
};

type ShopifyCommerceProviderData = {
    domain: string;
    storefrontId: string;
    authentication: {
        token: string;
        publicToken: string;
        customers: {
            id: string;
            clientId: string;
            clientSecret: string;
        };
    };
};

const ShopifySettings = ({ data: settings }: CommerceSettingsProps) => {
    const data = JSON.parse(settings?.data?.toString() || 'null') as ShopifyCommerceProviderData | null;

    return (
        <Card className={styles.section}>
            <Label as="label" htmlFor="domain">
                Domain
            </Label>
            <Card
                as="input"
                name="domain"
                placeholder="store-name.myshopify.com"
                defaultValue={data?.domain}
                required={true}
            />

            <Label as="label" htmlFor="storefrontId">
                Storefront ID
            </Label>
            <Card as="input" name="storefrontId" defaultValue={data?.storefrontId} required={true} />

            <Label as="label" htmlFor="token">
                Token
            </Label>
            <Card as="input" name="token" defaultValue={data?.authentication?.token} required={true} />

            <Label as="label" htmlFor="publicToken">
                Public Token
            </Label>
            <Card as="input" name="publicToken" defaultValue={data?.authentication?.publicToken} required={true} />

            <Label as="label" htmlFor="customersShopifyAccountsId">
                Shopify Accounts ID
            </Label>
            <Card
                as="input"
                name="customersShopifyAccountsId"
                defaultValue={data?.authentication?.customers?.id}
                required={true}
            />

            <Label as="label" htmlFor="customersClientId">
                Client ID
            </Label>
            <Card
                as="input"
                name="customersClientId"
                defaultValue={data?.authentication?.customers?.clientId}
                required={true}
            />

            <Label as="label" htmlFor="customersClientSecret">
                Client Secret
            </Label>
            <Card
                as="input"
                name="customersClientSecret"
                defaultValue={data?.authentication?.customers?.clientSecret}
                required={true}
            />
        </Card>
    );
};

const CommerceSettings = ({ data }: CommerceSettingsProps) => {
    const commerceTypes = Object.values(CommerceProviderType);
    const [type, setType] = useState(data?.type || commerceTypes[0]!);

    return (
        <>
            <Label as="label" htmlFor="type">
                Type
            </Label>
            <Card
                as="select"
                name="type"
                title="Type"
                onChange={(e: any) => setType(() => e.target.value)}
                value={type}
            >
                {Object.values(CommerceProviderType).map((e) => (
                    <option key={e} value={e}>
                        {e}
                    </option>
                ))}
            </Card>

            {type === CommerceProviderType.shopify && <ShopifySettings data={data} />}
        </>
    );
};

CommerceSettings.displayName = 'Nordcom.Admin.Settings.CommerceSettings';
export { CommerceSettings };
