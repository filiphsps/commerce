import { unstable_cache as cache } from 'next/cache';

import { ShopApi } from '@nordcom/commerce-database';

import { components as slices } from '@/slices';
import { getDictionary } from '@/utils/dictionary';
import { Locale } from '@/utils/locale';
import { SliceZone } from '@prismicio/react';
import { getSlices, SliceSimulator } from '@slicemachine/adapter-next/simulator';

import type { SliceSimulatorParams } from '@slicemachine/adapter-next/simulator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type SliceSimulatorPageParams = { domain: string };

export default async function SliceSimulatorPage({
    params: { domain },
    searchParams
}: {
    params: SliceSimulatorPageParams;
} & SliceSimulatorParams) {
    const locale = Locale.default;

    // Fetch the current shop.
    const shop = await ShopApi(domain, cache);

    // Get dictionary of strings for the current locale.
    const i18n = await getDictionary({ shop, locale });

    return (
        <SliceSimulator background="unset">
            <SliceZone
                components={slices}
                slices={getSlices(searchParams.state)}
                context={{ shop, i18n, locale, type: 'custom_page' }}
            />
        </SliceSimulator>
    );
}
