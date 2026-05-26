'use client';

import { parseGid } from '@shopify/hydrogen-react';
import { download, generateCsv, mkConfig } from 'export-to-csv';
import { Download as DownloadIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/actionable/button';
import { useCartCount, useCartLines } from '@/components/cart/provider';
import { useShop } from '@/components/shop/provider';
import { getTranslations, type LocaleDictionary } from '@/utils/locale';

type ExportCartButtonProps = {
    i18n: LocaleDictionary;
};
export function ExportCartButton({ i18n }: ExportCartButtonProps) {
    const [busy, setBusy] = useState(false);
    const { shop } = useShop();
    const { t } = getTranslations('common', i18n);
    const { lines, cartId } = useCartLines();
    const totalQuantity = useCartCount();

    if (!lines || lines.length <= 0 || !totalQuantity || totalQuantity <= 0 || !cartId) {
        return null;
    }

    return (
        <Button
            disabled={busy}
            styled={false}
            className="inline-flex items-center justify-stretch gap-1 font-bold text-sm uppercase leading-snug transition-colors hover:text-primary disabled:pointer-events-none disabled:brightness-50"
            onClick={async () => {
                setBusy(true);
                const data = lines.map(
                    ({
                        merchandise: { id, sku, variantTitle, productTitle, productVendor, productHandle },
                        quantity,
                    }) => ({
                        ...(sku ? { SKU: sku } : {}),
                        Vendor: productVendor,
                        Product: productTitle,
                        Variant: variantTitle,
                        URL: `https://${shop.domain}/products/${productHandle}/?variant=${parseGid(id).id}`,
                        Quantity: quantity,
                    }),
                );

                const config = mkConfig({
                    useKeysAsHeaders: true,
                    filename: `${parseGid(cartId).id}.csv`,
                });
                const csv = generateCsv(config)(data);

                download(config)(csv);
                setBusy(false);
            }}
        >
            <span className="h-4">{t('save-as-csv')}</span>
            <DownloadIcon className="h-4 stroke-2" />
        </Button>
    );
}
