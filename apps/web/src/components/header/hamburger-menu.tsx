'use client';

import styles from '@/components/header/hamburger-menu.module.scss';

import { type HTMLProps, useEffect, useState } from 'react';
import { CgClose, CgMenuLeftAlt } from 'react-icons/cg';
import { usePathname } from 'next/navigation';

type HamburgerMenuProps = {} & HTMLProps<HTMLDivElement>;
export const HamburgerMenu = ({ className, ...props }: HamburgerMenuProps) => {
    const [open, setOpen] = useState(false);
    const path = usePathname();

    useEffect(() => {
        setOpen(() => false);
    }, [path]);

    return (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
            {...props}
            onClick={() => {
                if (document.body.hasAttribute('data-menu-open')) {
                    document.body.removeAttribute('data-menu-open');
                    setOpen(() => false);
                } else {
                    document.body.setAttribute('data-menu-open', 'true');
                    setOpen(() => true);
                }
            }}
            className={`${styles.container} ${(open && styles.open) || ''} ${className || ''}`}
        >
            {open ? <CgClose className={styles.icon} /> : <CgMenuLeftAlt className={styles.icon} />}
        </div>
    );
};
