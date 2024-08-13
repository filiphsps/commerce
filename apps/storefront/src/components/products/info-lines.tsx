import { FiCheck } from 'react-icons/fi';

import { cn } from '@/utils/tailwind';

import { Label } from '@/components/typography/label';

import type { Product } from '@/api/product';
import type { HTMLProps } from 'react';

export type StockStatusProps = {
    product?: Product;
};
const StockStatus = ({ product }: StockStatusProps) => {
    if (!product || !product.availableForSale) return null;

    // TODO: Proper i18n.
    const available = `In stock and available`;

    return (
        <section
            className={cn('flex items-center justify-start gap-1 *:leading-none *:text-green-600')}
            title={available}
        >
            <FiCheck className="stroke-2 align-middle text-base" />
            <Label className="text-base font-semibold normal-case">{available}</Label>
        </section>
    );
};
StockStatus.displayName = 'Nordcom.Products.StockStatus';

export type InfoLinesProps = {
    product?: Product;
} & Omit<HTMLProps<HTMLDivElement>, 'children'>;

const InfoLines = ({ product, className, ...props }: InfoLinesProps) => {
    if (!product) return null;

    return (
        <div className={cn('flex w-full select-none flex-col items-start gap-4', className)} {...props}>
            <StockStatus product={product} />
        </div>
    );
};
InfoLines.displayName = 'Nordcom.Products.InfoLines';

export { InfoLines, StockStatus };
