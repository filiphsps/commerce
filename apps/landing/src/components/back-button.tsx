import { Label } from '@nordcom/nordstar';
import Link from 'next/link';
import type { HTMLProps } from 'react';
import { BiChevronLeft } from 'react-icons/bi';

export type BackButtonProps = {
    href: string;
} & HTMLProps<HTMLDivElement>;
export default function BackButton({ href }: BackButtonProps) {
    return (
        <Label className="flex items-center justify-start gap-[0.15rem] text-base" as={Link} href={href}>
            <BiChevronLeft className="inline-block h-full align-middle text-[1.5em] leading-[inherit]" />
            Back
        </Label>
    );
}
