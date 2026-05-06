import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';
import { DropdownDefaultMenu } from './default-menu';
import { DropdownMenuItem } from './menu-item';

export type DropdownProps = SliceComponentProps<Content.DropdownSlice, { isHeader: boolean; menu: string | null }>;
const Dropdown = ({ slice, context: { isHeader = false, menu = null } }: DropdownProps) => {
    if (isHeader) {
        return <DropdownMenuItem slice={slice} />;
    }

    if ((!menu || menu !== slice.id) && menu !== '__SLICE_MACHINE_TEST__') {
        return null;
    }

    switch (slice.variation) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        case 'default': {
            return <DropdownDefaultMenu slice={slice} />;
        }
    }

    return null;
};

export default Dropdown;
