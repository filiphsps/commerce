import type { ComponentPropsWithoutRef, ElementType, JSX, ReactNode } from 'react';
import { cn } from '@/utils/tailwind';

/** Semantic button intents, each driven entirely by P3 tokens (`--surface-*`/`--text*`/`--border-*`/`--state-*`/`--focus-ring`). */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

/** Chassis sizes controlling padding, gap, and font-size. */
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonPropsBase<ComponentGeneric extends ElementType> = {
    as?: ComponentGeneric;
    styled?: boolean;
    variant?: ButtonVariant;
    size?: ButtonSize;
    children?: ReactNode;
    className?: string;
    disabled?: boolean;
};

export type ButtonProps<ComponentGeneric extends ElementType> = ButtonPropsBase<ComponentGeneric> &
    (ComponentGeneric extends keyof React.JSX.IntrinsicElements
        ? Omit<ComponentPropsWithoutRef<ComponentGeneric>, keyof ButtonPropsBase<ComponentGeneric>>
        : ComponentPropsWithoutRef<ComponentGeneric>);

/** Resting surface/text/border per variant. `primary` also carries the `data-success` confirmation state. */
const VARIANT_BASE: Record<ButtonVariant, string> = {
    primary:
        'bg-primary text-primary-foreground data-[success=true]:bg-(--state-success) data-[success=true]:text-white',
    secondary: 'border border-(--border-default) border-solid bg-(--surface-1) text-(color:var(--text))',
    outline: 'border border-(--border-strong) border-solid bg-transparent text-(color:var(--text))',
    ghost: 'bg-transparent text-(color:var(--text))',
    destructive: 'bg-transparent text-(color:var(--text))',
};

/** Interaction (hover/focus/active) styles applied only when the button is enabled. */
const VARIANT_INTERACTION: Record<ButtonVariant, string> = {
    primary: 'drop-shadow hover:shadow-lg hover:brightness-75 focus-visible:brightness-75 active:brightness-75',
    secondary: 'hover:bg-(--text) hover:text-(color:var(--surface-1)) active:brightness-95',
    outline: 'hover:bg-(--surface-1) active:brightness-95',
    ghost: 'hover:bg-(--surface-1) active:brightness-95',
    destructive: 'hover:text-(color:var(--state-danger)) focus-visible:text-(color:var(--state-danger))',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
    sm: 'gap-1 px-2 py-1 text-sm',
    md: 'gap-1 px-3 py-2 text-base',
    lg: 'gap-2 px-4 py-3 text-lg',
};

/** Shared chassis for every styled variant. Disabled colors and the focus ring resolve from semantic tokens; the transition is motion-safe-gated. */
const CHASSIS =
    'inline-flex max-h-full cursor-pointer select-none items-center justify-center rounded-xl font-semibold leading-none focus-ring *:text-inherit motion-safe:transition-all motion-safe:duration-150 disabled:cursor-not-allowed disabled:bg-(--surface-3) disabled:text-(color:var(--text-muted)) disabled:shadow-none disabled:brightness-100';

/**
 * Polymorphic button with a tokenized variant + size system.
 *
 * Every visual is driven by the P3 semantic tokens (`--surface-*`, `--text*`, `--border-*`,
 * `--state-*`, `--focus-ring`), so a theme-less shop renders sensibly and a tenant theme recolors
 * the whole set. Pass `styled={false}` to opt out of the chassis entirely (bare element with only the
 * appearance reset + motion-safe color transition), for callers that hand-roll their own surface.
 *
 * @param props.as - Element or component to render; defaults to `button`.
 * @param props.styled - When `true` (default), applies the chassis + `variant` + `size`. When `false`, renders bare.
 * @param props.variant - Semantic intent; defaults to `primary`. Ignored when `styled` is `false`.
 * @param props.size - Chassis size; defaults to `md`. Ignored when `styled` is `false`.
 * @param props.disabled - Prevents interaction and dims the element when `true`.
 * @param props.className - Additional class names, merged last so callers can override.
 * @returns The rendered button element.
 */
export const Button = <ComponentGeneric extends ElementType = 'button'>({
    as,
    styled = true,
    variant = 'primary',
    size = 'md',
    className,
    ...props
}: ButtonProps<ComponentGeneric>): JSX.Element => {
    const Tag = as ?? 'button';

    return (
        <Tag
            {...props}
            className={cn(
                'appearance-none motion-safe:transition-colors motion-safe:duration-150',
                styled && [CHASSIS, SIZE_STYLES[size], VARIANT_BASE[variant]],
                !props.disabled && styled && VARIANT_INTERACTION[variant],
                props.disabled && 'pointer-events-none cursor-not-allowed shadow-none',
                className,
            )}
            draggable={false}
            suppressHydrationWarning={true}
            data-nosnippet={true}
        />
    );
};
Button.displayName = 'Nordcom.Actionable.Button';
