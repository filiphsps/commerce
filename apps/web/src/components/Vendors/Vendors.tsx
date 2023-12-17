'use client';

import Link from '@/components/link';
import type { VendorModel } from '@/models/VendorModel';
import styled from 'styled-components';

const Container = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
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
const Vendor = styled(Link)`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--block-padding) var(--block-padding);
    background: var(--accent-secondary);
    color: var(--accent-secondary-text);

    border-radius: var(--block-border-radius);
    text-align: center;
    text-decoration: none;
    text-transform: uppercase;
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1;
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

export type VendorsProps = {
    data: Array<VendorModel>;
};
const Vendors = ({ data: vendors }: VendorsProps) => {
    if (!vendors) return <Container className="Vendors">{/* TODO: Shimmer */}</Container>;

    return (
        <Container className="Vendors">
            {vendors?.map?.((vendor: VendorModel) => {
                if (!vendor?.handle) return null;

                return (
                    <Vendor key={vendor?.handle} href={`/collections/${vendor?.handle}/`} className={`Vendors-Vendor`}>
                        {vendor?.title}
                    </Vendor>
                );
            })}
        </Container>
    );
};

export default Vendors;
