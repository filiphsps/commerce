'use client';

import { parseGid, useCart } from '@shopify/hydrogen-react';
import type { CartLine } from '@shopify/hydrogen-react/storefront-api-types';
import { download, generateCsv, mkConfig } from 'export-to-csv';
import { Download as DownloadIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/actionable/button';
import { useShop } from '@/components/shop/provider';
import { getTranslations, type LocaleDictionary } from '@/utils/locale';

type ExportCartButtonProps = {
    i18n: LocaleDictionary;
};
export function ExportCartButton({ i18n }: ExportCartButtonProps) {
    const [busy, setBusy] = useState(false);
    const { shop } = useShop();
    const { t } = getTranslations('common', i18n);
    const { lines, totalQuantity, id: cartId } = useCart();

    if (!lines || lines.length <= 0 || !totalQuantity || totalQuantity <= 0) {
        return null;
    }

    return (
        <Button
            disabled={busy}
            styled={false}
            className="inline-flex items-center justify-stretch gap-1 font-bold text-sm uppercase leading-snug transition-colors hover:text-primary disabled:pointer-events-none disabled:brightness-50"
            onClick={async () => {
                setBusy(true);
                const data: any[] = (lines.filter(Boolean) as CartLine[]).map(
                    ({
                        merchandise: {
                            id,
                            barcode,
                            sku,
                            title: variantTitle,
                            product: { title, vendor, handle },
                        },
                        quantity,
                    }) => ({
                        'GTIN/EAN': barcode ? `#${barcode}` : null,
                        ...(sku && sku !== barcode ? { SKU: sku } : {}),
                        Vendor: vendor,
                        Product: title,
                        Variant: variantTitle,
                        URL: `https://${shop.domain}/products/${handle}/?variant=${parseGid(id).id}`,
                        Quantity: quantity,
                    }),
                );

                const config = mkConfig({
                    useKeysAsHeaders: true,
                    filename: `${parseGid(cartId).id}.csv`,
                });
                const csv = generateCsv(config)(data);

                download(config)(csv);
                setBusy(true);
            }}
        >
            <span className="h-4">{t('save-as-csv')}</span>
            <DownloadIcon className="h-4 stroke-2" />
        </Button>
    );
}
