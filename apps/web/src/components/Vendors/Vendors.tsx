'use client';

import { VendorsApi } from '@/api/shopify/vendor';
import PageLoader from '@/components/PageLoader';
import Link from '@/components/link';
import type { VendorModel } from '@/models/VendorModel';
import { ShopifyApolloApiBuilder } from '@/utils/abstract-api';
import { BuildConfig } from '@/utils/build-config';
import { NextLocaleToLocale } from '@/utils/locale';
import { useApolloClient } from '@apollo/client';
import { usePathname } from 'next/navigation';
import type { FunctionComponent } from 'react';
import styled from 'styled-components';
import useSWR from 'swr';

const Container = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: var(--block-spacer);

    @media (max-width: 950px) {
        display: flex;
        overflow-x: auto;
        flex-wrap: nowrap;
        white-space: nowrap;
        gap: 0;
        padding: var(--block-padding);
        margin: calc(var(--block-padding) * -1);
    }
`;
const Vendor = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem 0.5rem;
    background: var(--accent-secondary);
    color: var(--accent-secondary-text);

    border-radius: var(--block-border-radius);
    text-align: center;
    text-decoration: none;
    font-size: 1.25rem;
    font-weight: 700;
    cursor: pointer;

    &.ShowMore {
        font-weight: 700;
    }

    &.Selected {
        background: var(--accent-secondary-dark);
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background: var(--accent-secondary-dark);
        }
    }

    @media (max-width: 950px) {
        padding: 1rem 1.25rem;
        margin-right: 1rem;
    }
`;

interface VendorsProps {
    data?: Array<VendorModel>;
}
const Vendors: FunctionComponent<VendorsProps> = (props) => {
    const route = usePathname();
    const locale = NextLocaleToLocale(route?.split('/').at(1) || BuildConfig.i18n.default)!; // FIXME: Handle this properly.

    const { data: vendors } = useSWR(
        [
            'VendorsApi',
            {
                client: ShopifyApolloApiBuilder({ locale, api: useApolloClient() })
            }
        ],
        ([, props]) => VendorsApi(props),
        {
            fallbackData: props?.data
        }
    );

    if (!vendors)
        return (
            <Container className="Vendors">
                <PageLoader />
            </Container>
        );

    return (
        <Container className="Vendors">
            {vendors?.map?.((vendor: VendorModel) => {
                if (!vendor?.handle) return null;

                return (
                    <Link
                        key={vendor?.handle}
                        href={`/collections/${vendor?.handle}/`}
                        className={`Vendors-Vendor ${
                            (route?.includes(`brands/${vendor?.handle}`) && 'Selected') || ''
                        }`}
                    >
                        <Vendor>{vendor?.title}</Vendor>
                    </Link>
                );
            })}
        </Container>
    );
};

export default Vendors;
