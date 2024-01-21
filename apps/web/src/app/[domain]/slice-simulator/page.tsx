'use client';

import english from '@/i18n/en.json';
import { Locale } from '@/utils/locale';
import { SliceZone } from '@prismicio/react';
import { SliceSimulator } from '@slicemachine/adapter-next/simulator';

export const dynamic = 'force-dynamic';

export default function SliceSimulatorPage() {
    const locale = Locale.default;

    return (
        <SliceSimulator
            sliceZone={({ slices, ...props }) => (
                <SliceZone {...props} components={slices as any} context={{ locale, i18n: english }} />
            )}
        />
    );
}
