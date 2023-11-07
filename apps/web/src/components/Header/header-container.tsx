import type { HTMLProps, ReactNode } from 'react';

import styles from '@/components/Header/header.module.scss';
import { RemoveInvalidProps } from '@/utils/remove-invalid-props';

type HeaderContainerProps = {
    children?: ReactNode;
} & HTMLProps<HTMLDivElement>;
export const HeaderContainer = (props: HeaderContainerProps) => {
    return (
        <header
            {...RemoveInvalidProps({ ...props, children: undefined })}
            className={`${styles.container} ${props.className || ''}`}
        >
            <div className={styles.content}>{props.children}</div>
        </header>
    );
};
