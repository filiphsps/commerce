import { PiInfoBold } from 'react-icons/pi';

import { cn } from '@/utils/tailwind';

import { Content } from '@/components/typography/content';

import type { HTMLProps } from 'react';

export type AlertProps = {
    severity: 'success' | 'info' | 'warning' | 'error' | 'callout';
    children: React.ReactNode;
    icon?: false | React.ReactNode;
} & HTMLProps<HTMLDivElement>;
export const Alert = ({ children, severity, icon, className, ...props }: AlertProps) => {
    return (
        <div
            className={cn(
                'flex items-start justify-start gap-3 rounded-lg p-4 text-base',
                severity === 'success' && 'bg-green-200',
                severity === 'info' && 'bg-gray-100',
                severity === 'warning' && 'bg-yellow-200',
                severity === 'error' && 'bg-red-600',
                severity === 'callout' && 'bg-primary text-primary-foreground',
                className
            )}
            data-severity={severity}
            {...props}
        >
            {icon === false ? null : (
                <>{!icon ? <PiInfoBold className="block aspect-square w-36 text-2xl text-inherit md:w-48" /> : icon}</>
            )}

            <Content className="leading-tight text-inherit">{children}</Content>
        </div>
    );
};
