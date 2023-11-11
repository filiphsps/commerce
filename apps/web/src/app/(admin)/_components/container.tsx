import styles from '#/components/container.module.scss';
import type { HTMLProps, ReactNode } from 'react';

export type PageProps = {
    children: ReactNode;
} & HTMLProps<HTMLDivElement>;
export default function Container(props: PageProps) {
    return <main {...props} className={`${styles.container} ${props.className || ''}`} />;
}
