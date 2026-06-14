import type { CommerceProvider, CommerceProviders } from '@nordcom/commerce-db';
import type { ComponentType } from 'react';

/**
 * Props every provider connect-step component receives from the wizard: the collected values, a change
 * callback to lift them into wizard state, and a callback firing the live validation verdict so the
 * wizard can gate the Next button.
 */
export type ConnectFormProps = {
    /** Current collected values for this provider's connect step. */
    value: Record<string, string>;
    /** Lifts updated values into wizard state. */
    onChange: (value: Record<string, string>) => void;
    /** Reports whether the connection has been validated (`true`) or invalidated (`false`). */
    onTestResult: (ok: boolean) => void;
};

/** UI-side registry entry: how a provider presents itself and collects its connection. */
export type ProviderUiEntry = {
    id: CommerceProviders;
    label: string;
    ConnectForm: ComponentType<ConnectFormProps>;
};

/** Server-side mapper: turns a provider's collected values into the stored `commerceProvider`. */
export type ProviderMapper = (values: Record<string, string>) => CommerceProvider;
