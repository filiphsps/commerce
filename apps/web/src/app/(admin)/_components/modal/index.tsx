'use client';

import styles from '#/components/modal.module.scss';
import { Card } from '@nordcom/nordstar';
import type { Dispatch, ReactNode, SetStateAction } from 'react';

export type ModalProps = {
    children: ReactNode;
    showModal: ConstrainBooleanParameters;
    setShowModal: Dispatch<SetStateAction<boolean>>;
};
export default function Modal({ children, showModal }: ModalProps) {
    if (!showModal) return null;

    return <Card className={styles.container}>{children}</Card>;
}
