import type { CSSProperties, ReactNode, SVGProps } from 'react';

export type PaymentIconChrome = 'card' | 'none';

export type PaymentIconProps = Omit<SVGProps<SVGSVGElement>, 'title' | 'children' | 'width' | 'height'> & {
    size?: number | string;
    width?: number | string;
    height?: number | string;
    title?: string | null;
    chrome?: PaymentIconChrome;
    className?: string;
    style?: CSSProperties;
};

export type IconShellProps = PaymentIconProps & {
    viewBox: string;
    children: ReactNode;
};

const CHROME_OUTER_D = 'M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z';
const CHROME_INNER_D = 'M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32';

export function IconShell({ viewBox, title, chrome = 'card', size, width, height, children, ...rest }: IconShellProps) {
    const w = width ?? size ?? 38;
    const h = height ?? size ?? 24;
    const isHidden = title === null;
    const ariaProps = isHidden ? { 'aria-hidden': true as const } : { role: 'img', 'aria-label': title };

    return (
        <svg viewBox={viewBox} width={w} height={h} xmlns="http://www.w3.org/2000/svg" {...ariaProps} {...rest}>
            {!isHidden && <title>{title}</title>}
            {chrome === 'card' && (
                <>
                    <path data-rpbi-chrome="outer" opacity={0.07} d={CHROME_OUTER_D} />
                    <path data-rpbi-chrome="inner" fill="#fff" d={CHROME_INNER_D} />
                </>
            )}
            {children}
        </svg>
    );
}
