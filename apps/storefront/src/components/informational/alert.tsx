import {
    CircleAlert as CircleAlertIcon,
    CircleCheck as CircleCheckIcon,
    CircleHelp as CircleHelpIcon,
} from 'lucide-react';
import type { HTMLProps } from 'react';

import { Content } from '@/components/typography/content';
import { cn } from '@/utils/tailwind';

const ICON_STYLES = 'flex text-inherit';

export type AlertProps = {
    severity: 'success' | 'info' | 'warning' | 'error' | 'callout';
    children: React.ReactNode;
    icon?: false | React.ReactNode;
} & HTMLProps<HTMLDivElement>;

/**
 * Surface + legible foreground per severity, every value resolved from the P3 semantic tokens so a
 * theme-less shop renders sensibly while a tenant theme recolors the set. Each colored surface pairs
 * with an explicit on-surface ink that clears WCAG AA (pinned in design-tokens.gate.test.ts) — the
 * default `--text` would be illegible on the saturated danger fill.
 */
const SEVERITY_SURFACE: Record<AlertProps['severity'], string> = {
    success: 'bg-(--surface-success) text-(color:var(--text-success-strong))',
    info: 'bg-(--surface-1) text-(color:var(--text))',
    warning: 'bg-(--surface-warning) text-(color:var(--text-warning-strong))',
    error: 'bg-(--state-danger) text-white',
    callout: 'bg-primary text-primary-foreground',
};

/** Severities that carry urgency announce themselves to assistive tech; the rest are polite status. */
const SEVERITY_ROLE: Record<AlertProps['severity'], 'alert' | 'status'> = {
    success: 'status',
    info: 'status',
    warning: 'alert',
    error: 'alert',
    callout: 'status',
};

/**
 * Themed alert box with an automatic severity icon and optional custom icon override.
 *
 * @param props.severity - Controls the surface/foreground token pair, the default icon, and the ARIA role.
 * @param props.children - Alert body content.
 * @param props.icon - Override icon element; pass `false` to suppress the default icon entirely.
 * @param props.className - Additional CSS class names.
 * @param props.role - Overrides the severity-derived ARIA role (`alert` for warning/error, `status` otherwise).
 * @returns The styled alert element.
 */
export const Alert = ({ children, severity, icon, className, role, ...props }: AlertProps) => {
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
            default:
                iconElement = <CircleHelpIcon className={ICON_STYLES} />;
        }
    } else if (typeof icon !== 'boolean') {
        iconElement = icon;
    }

    return (
        <div
            role={role ?? SEVERITY_ROLE[severity]}
            className={cn(
                'flex items-start justify-start gap-[var(--block-spacer-large)] rounded-lg p-[var(--block-padding-large)] text-base',
                SEVERITY_SURFACE[severity],
                className,
            )}
            data-severity={severity}
            {...props}
        >
            {iconElement ? <div className="aspect-square text-3xl">{iconElement}</div> : null}

            <Content className="h-full">{children}</Content>
        </div>
    );
};
