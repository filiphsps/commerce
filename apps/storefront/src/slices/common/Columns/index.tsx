import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';
import { Error, NotFoundError } from '@nordcom/commerce-errors';

import { Locale } from '@/utils/locale';
import { createClient } from '@/utils/prismic';

import PrismicPage from '@/components/cms/prismic-page';

import type { ColumnDocument } from '@/prismic/types';
import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';

export type ColumnsProps = SliceComponentProps<Content.ColumnsSlice, { shop: OnlineShop; locale: Locale }>;
const Columns = async ({ slice, context: { shop, locale } }: ColumnsProps) => {
    const sensitiveShop = await Shop.findByDomain(shop.domain, { sensitiveData: true });
    const client = createClient({ shop: sensitiveShop, locale });

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
                if (!(uid as any)) {
                    return null;
                }

                const { slices } = await (async () => {
                    // FIXME: This should be in an API helper.
                    try {
                        const { data } = await client.getByUID<ColumnDocument>(type as any, uid);
                        if (!data) {
                            throw new NotFoundError(`"Columns" with the uid "${uid}"`);
                        }

                        return data;
                    } catch (error: unknown) {
                        if (Error.isNotFound(error) && !Locale.isDefault(locale)) {
                            const client = createClient({ shop: sensitiveShop, locale: Locale.default });
                            const { data } = await client.getByUID<ColumnDocument>(type as any, uid);
                            if (!data) {
                                throw new NotFoundError(`"Columns" with the uid "${uid}"`);
                            }

                            return data;
                        }

                        throw error;
                    }
                })();

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
