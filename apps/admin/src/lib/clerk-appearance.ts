import type { ClerkProvider } from '@clerk/nextjs';
import type { ComponentProps } from 'react';

/**
 * The Clerk `appearance` prop type, derived from `<ClerkProvider>`'s props so it resolves without a
 * direct dependency on the transitive `@clerk/types` package.
 */
type Appearance = NonNullable<ComponentProps<typeof ClerkProvider>['appearance']>;

/**
 * Clerk `appearance` mapped onto the admin's Nordstar design tokens so the prebuilt Clerk surfaces
 * (`<SignIn/>`, `<SignUp/>`, `<UserButton/>`, …) read as native admin chrome rather than Clerk's
 * default look. The values mirror `app/globals.css`'s dark-only token set:
 *
 * - `colorPrimary` is the magenta accent (`--primary` `333.62 85.19% 52.35%` = `#ED1E79`).
 * - `colorBackground` is the flat-dark canvas (`--background` `0 0% 0%` = `#000000`).
 * - `colorForeground` is the near-white text color (`--foreground` `0 0% 99.61%` ≈ `#fefefe`).
 * - `borderRadius` matches `--radius` (`0.5rem`).
 * - `fontFamily` defers to the Montserrat custom property the shell already sets (`--font-primary`).
 *
 * `baseTheme` is left unset so the variables/elements below fully drive the look; pulling in
 * `@clerk/themes`'s `dark` base would re-introduce Clerk's own palette underneath these overrides.
 * The dark canvas is instead asserted directly through `colorBackground`/`colorText`.
 *
 * The `elements` make Clerk's card chrome transparent and borderless so it nests cleanly INSIDE the
 * existing {@link import('@/components/auth-shell').AuthShell} (which already supplies the bordered
 * glass card + pink halo); the primary button takes the Nordstar solid-primary magenta look, and the
 * social-connection buttons are outlined and sized to the shell's `h-12` controls.
 */
export const clerkAppearance: Appearance = {
    variables: {
        colorPrimary: '#ed1e79',
        colorBackground: '#000000',
        colorForeground: '#fefefe',
        borderRadius: '0.5rem',
        fontFamily: 'var(--font-primary)',
    },
    elements: {
        // The card sits inside AuthShell's own bordered glass card, so strip Clerk's frame entirely
        // to avoid a double-card seam.
        rootBox: 'w-full',
        card: 'bg-transparent shadow-none border-0 p-0 w-full',
        cardBox: 'bg-transparent shadow-none border-0 w-full',
        // AuthShell already renders the logo + eyebrow + heading, so suppress Clerk's duplicate header.
        header: 'hidden',
        footer: 'bg-transparent',
        formButtonPrimary:
            'bg-primary text-primary-foreground font-bold uppercase tracking-wide h-12 rounded-lg hover:bg-primary/90 normal-case',
        socialButtonsBlockButton: 'border-3 border-border border-solid h-12 rounded-lg hover:border-primary',
        socialButtonsIconButton: 'border-3 border-border border-solid size-12 rounded-lg hover:border-primary',
        formFieldInput: 'border-3 border-border border-solid rounded-lg bg-background/40 h-12',
        dividerLine: 'bg-border',
        // The UserButton/OrganizationSwitcher popovers render in a portal where Clerk's
        // `colorForeground` variable does not reach the action rows, so their labels (Manage account,
        // Sign out, the custom theme toggle) fall back to Clerk's light-theme near-black text and turn
        // invisible on the dark popover. Pin the action button — and its currentColor icon — to the
        // admin foreground token. `userButtonPopoverActionButtonText` is gone since Clerk core-2 (the
        // label renders directly inside the button), so the color must live on the button itself.
        userButtonPopoverActionButton: 'text-foreground',
        userButtonPopoverActionButtonIcon: 'text-foreground',
        organizationSwitcherPopoverActionButton: 'text-foreground',
        organizationSwitcherPopoverActionButtonIcon: 'text-foreground',
    },
};
