import dynamic from 'next/dynamic';

import type { VendorsProps } from './Vendors';
export type { VendorsProps };

const Vendors = dynamic(() => import('./Vendors'));

export default Vendors;
