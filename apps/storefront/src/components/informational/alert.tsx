import { cn } from '@/utils/tailwind';
import {
    CircleAlert as CircleAlertIcon,
    CircleCheck as CircleCheckIcon,
    CircleHelp as CircleHelpIcon
} from 'lucide-react';

import { Content } from '@/components/typography/content';

import type { HTMLProps } from 'react';

const ICON_STYLES = 'flex text-inherit';

export type AlertProps = {
    severity: 'success' | 'info' | 'warning' | 'error' | 'callout';
    children: React.ReactNode;
    icon?: false | React.ReactNode;
} & HTMLProps<HTMLDivElement>;
export const Alert = ({ children, severity, icon, className, ...props }: AlertProps) => {
    let iconElement: React.ReactNode | null = null;
    if (typeof icon === 'undefined' || (typeof icon === 'boolean' && icon !== false)) {
        switch (severity) {
            case 'success':
                iconElement = <CircleCheckIcon className={ICON_STYLES} />;
                break;

            case 'warning':
                iconElement = <CircleAlertIcon className={ICON_STYLES} />;
                break;
            case 'error':
                iconElement = <CircleAlertIcon className={ICON_STYLES} />;
                break;

            case 'callout':
                break;

            case 'info':
            default:
                iconElement = <CircleHelpIcon className={ICON_STYLES} />;
        }
    } else if (typeof icon !== 'boolean') {
        iconElement = icon;
    }

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
            {iconElement ? <div className="aspect-square text-3xl">{iconElement}</div> : null}

            <Content className="h-full">{children as any}</Content>
        </div>
    );
};
