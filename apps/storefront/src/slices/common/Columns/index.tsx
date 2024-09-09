import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';

import { createClient } from '@/utils/prismic';

import PrismicPage from '@/components/cms/prismic-page';

import type { ColumnDocument } from '@/prismic/types';
import type { Locale } from '@/utils/locale';
import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';

export type ColumnsProps = SliceComponentProps<Content.ColumnsSlice, { shop: OnlineShop; locale: Locale }>;
const Columns = async ({ slice, context: { shop, locale } }: ColumnsProps) => {
    const client = createClient({ shop: await Shop.findByDomain(shop.domain, { sensitiveData: true }), locale });

    return (
        <section
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
            className="flex flex-wrap gap-3 md:grid"
            style={{
                gridTemplateColumns: slice.primary.children.map(() => '1fr').join(' ') // TODO: custom sizes?.
            }}
        >
            {slice.primary.children.map(async ({ column }) => {
                const { uid, type, id } = column as { uid: string; type: string; id: string };
                const { slices } = (await client.getByUID<ColumnDocument>(type as any, uid)).data;

                return (
                    <div className="min-w-18 flex w-full flex-col gap-3" key={id}>
                        <PrismicPage shop={shop} locale={locale} handle={uid} slices={slices} />
                    </div>
                );
            })}
        </section>
    );
};

export default Columns;
