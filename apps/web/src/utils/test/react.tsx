import { ShopProvider } from '@/components/shop/provider';
import { Locale } from '@/utils/locale';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

const Providers = ({ children }: { children: ReactNode }) => {
    const shop = {
        domains: {
            primary: 'example.com'
        }
    } as any;
    return (
        <ShopProvider shop={shop} locale={Locale.default} currency={'USD'}>
            {children}
        </ShopProvider>
    );
};

const customRender = (ui: Parameters<typeof render>[0], options?: Parameters<typeof render>[1]) =>
    render(ui, { wrapper: Providers, ...options });

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };
