'use client';

import { useState, type HTMLProps, type ReactNode } from 'react';
import { TbMenuDeep, TbX } from 'react-icons/tb';

import styles from '@/components/Header/hamburger-menu.module.scss';
import { RemoveInvalidProps } from '@/utils/remove-invalid-props';

type HamburgerMenuProps = {
    children?: ReactNode;
} & HTMLProps<HTMLDivElement>;
export const HamburgerMenu = (props: HamburgerMenuProps) => {
    const [open, setOpen] = useState(false);

    return (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
            {...RemoveInvalidProps(props)}
            onClick={() => {
                if (document.body.hasAttribute('data-menu-open')) {
                    document.body.removeAttribute('data-menu-open');
                    setOpen(false);
                } else {
                    document.body.setAttribute('data-menu-open', 'true');
                    setOpen(true);
                }
            }}
            className={`${styles.container} ${(open && styles.open) || ''} ${props.className || ''}`}
        >
            {open ? <TbX className={styles.icon} /> : <TbMenuDeep className={styles.icon} />}
        </div>
    );
};
