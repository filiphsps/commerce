'use client';

import { Input } from '@nordcom/nordstar';
import { CommerceProviderType, type CommerceProvider } from '@prisma/client/edge';
import { useState } from 'react';

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
    const data = (
        typeof settings?.data === 'object' ? settings?.data : JSON.parse(settings?.data?.toString() || 'null')
    ) as ShopifyCommerceProviderData | null;

    return (
        <>
            <Input
                type="text"
                name="domain"
                label="Domain"
                placeholder="store-name.myshopify.com"
                defaultValue={data?.domain}
                required={true}
            />

            <Input
                type="text"
                name="storefrontId"
                label="Storefront ID"
                defaultValue={data?.storefrontId}
                required={true}
            />

            <Input type="text" name="token" label="Token" defaultValue={data?.authentication?.token} required={true} />

            <Input
                type="text"
                name="publicToken"
                label="Public Token"
                defaultValue={data?.authentication?.publicToken}
                required={true}
            />

            <Input
                type="text"
                name="customersShopifyAccountsId"
                label="Shopify Accounts ID"
                defaultValue={data?.authentication?.customers?.id}
                required={true}
            />

            <Input
                type="text"
                name="customersClientId"
                label="Client ID"
                defaultValue={data?.authentication?.customers?.clientId}
                required={true}
            />

            <Input
                type="text"
                name="customersClientSecret"
                label="Client Secret"
                defaultValue={data?.authentication?.customers?.clientSecret}
                required={true}
            />
        </>
    );
};

const CommerceSettings = ({ data }: CommerceSettingsProps) => {
    const commerceTypes = Object.values(CommerceProviderType);
    const [type, setType] = useState(data?.type || commerceTypes[0]!);

    return (
        <>
            <Input
                as="select"
                type="select"
                name="type"
                title="Type"
                label="Type"
                onChange={(e: any) => setType(() => e.target.value)}
                value={type}
            >
                {Object.values(CommerceProviderType).map((e) => (
                    <option key={e} value={e}>
                        {e}
                    </option>
                ))}
            </Input>

            {type === CommerceProviderType.shopify && <ShopifySettings data={data} />}
        </>
    );
};

CommerceSettings.displayName = 'Nordcom.Admin.Settings.CommerceSettings';
export { CommerceSettings };
