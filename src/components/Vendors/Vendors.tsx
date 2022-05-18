import React, { FunctionComponent } from 'react';

import Link from '../Link';
import Loader from '../Loader';
import { VendorModel } from '../../models/VendorModel';
import { VendorsApi } from '../../api';
import { useRouter } from 'next/router';
import useSWR from 'swr';

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
            <div className="Vendors">
                <Loader />
            </div>
        );

    return (
        <div className="Vendors">
            {vendors?.map?.((vendor: VendorModel, index) => {
                if (!vendor?.handle) return null;

                return (
                    <Link
                        key={vendor?.handle}
                        as={'/collections/[handle]'}
                        to={`/collections/${vendor?.handle}`}
                        className={`Vendors-Vendor ${
                            (router?.asPath?.includes(
                                `brands/${vendor?.handle}`
                            ) &&
                                'Selected') ||
                            ''
                        }`}
                    >
                        {vendor?.title}
                    </Link>
                );
            })}
        </div>
    );
};

export default Vendors;
