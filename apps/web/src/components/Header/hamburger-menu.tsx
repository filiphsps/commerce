import { FiAlignLeft, FiX } from 'react-icons/fi';
import type { HTMLProps, ReactNode } from 'react';

import { RemoveInvalidProps } from '@/utils/remove-invalid-props';
import styles from '@/components/Header/hamburger-menu.module.scss';

type HamburgerMenuProps = {
    children?: ReactNode;
    open?: boolean;
} & HTMLProps<HTMLDivElement>;
export const HamburgerMenu = (props: HamburgerMenuProps) => {
    const { open } = props;

    return (
        <div {...RemoveInvalidProps(props)} className={`${styles.container} ${props.className || ''}`}>
            {open ? <FiX className={styles.icon} /> : <FiAlignLeft className={styles.icon} />}
        </div>
    );
};
