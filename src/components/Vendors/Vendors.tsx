import React, { FunctionComponent } from 'react';

import Link from 'next/link';
import Loader from '../Loader';
import { VendorModel } from '../../models/VendorModel';
import { VendorsApi } from '../../api/vendor';
import styled from 'styled-components';
import { useRouter } from 'next/router';
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
        gap: 0px;
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

    box-shadow: 0px 0px 1rem -0.25rem var(--color-block-shadow);

    border-radius: var(--block-border-radius);
    text-align: center;
    text-decoration: none;
    font-size: 1.25rem;
    font-weight: 700;
    cursor: pointer;

    &.ShowMore {
        font-weight: 700;
    }

    &.Selected,
    &:hover {
        background: var(--accent-secondary-dark);
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
    const { data: vendors } = useSWR([''], () => VendorsApi(), {
        fallbackData: props?.data
    }) as any;
    const router = useRouter();

    if (!vendors)
        return (
            <Container className="Vendors">
                <Loader />
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
                            (router?.asPath?.includes(`brands/${vendor?.handle}`) && 'Selected') ||
                            ''
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
