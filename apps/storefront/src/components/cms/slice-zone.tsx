import { Fragment, Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { SliceZone as PrismicSliceZone } from '@prismicio/react';

import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { Slice as PrismicSlice, SliceZone as PrismicSlices } from '@prismicio/client';
import type { ComponentProps, ComponentType } from 'react';

export type Slice = PrismicSlice<any, any>;
export type Slices = PrismicSlices<Slice>;

export type SliceZone = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    data?: Slices;
    components?: ComponentProps<typeof PrismicSliceZone>['components'];
    context?: {
        [key: string]: unknown;
    };
};

export async function SliceZone({ shop, locale, i18n, data = [], components, context = {} }: SliceZone) {
    return (
        <Suspense fallback={<Fragment />}>
            <PrismicSliceZone
                slices={data}
                components={components as any}
                context={{
                    shop: {
                        ...shop,
                        commerceProvider: {},
                        contentProvider: {}
                    },
                    i18n,
                    locale,
                    ...context
                }}
            />
        </Suspense>
    );
}
SliceZone.displayName = 'Nordcom.CMS.SliceZone';

async function skeleton({ shop, locale, i18n, data = [], components = {}, context = {} }: Partial<SliceZone>) {
    if (data.length <= 0 || Object.keys(components).length <= 0) {
        return null;
    }

    return (
        <>
            {data.map((slice, index) => {
                if (!slice.slice_type) {
                    return null;
                }

                const Slice = components[slice.slice_type] as
                    | undefined
                    | ((typeof components)[string] & {
                          skeleton?: ComponentType<any>;
                      });
                if (!Slice) {
                    return null;
                }

                const key = 'id' in slice ? slice.id : JSON.stringify(slice);
                const props = {
                    index,
                    slice,
                    slices: data,
                    context: {
                        shop: {
                            ...shop,
                            commerceProvider: {},
                            contentProvider: {}
                        },
                        i18n,
                        locale,
                        ...context
                    }
                };

                if (Slice.skeleton) {
                    return <Slice.skeleton key={key} {...props} data-skeleton />;
                }

                return <Slice key={key} {...props} />;
            })}
        </>
    );
}
SliceZone.skeleton = skeleton as typeof skeleton & { displayName: string };
SliceZone.skeleton.displayName = 'Nordcom.CMS.SliceZone.Skeleton';
