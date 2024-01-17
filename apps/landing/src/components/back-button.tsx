import styles from '@/components/back-button.module.scss';
import { Label } from '@nordcom/nordstar';
import Link from 'next/link';
import type { HTMLProps } from 'react';
import { BiChevronLeft } from 'react-icons/bi';

export type BackButtonProps = {
    href: string;
} & HTMLProps<HTMLDivElement>;
export default function BackButton({ href }: BackButtonProps) {
    return (
        <Label className={styles.container} as={Link} href={href}>
            <BiChevronLeft />
            Back
        </Label>
    );
}