'use client';

import english from '@/i18n/en.json';
import { DefaultLocale } from '@/utils/locale';
import { SliceZone } from '@prismicio/react';
import { SliceSimulator } from '@slicemachine/adapter-next/simulator';

export default function SliceSimulatorPage() {
    const locale = DefaultLocale();

    return (
        <SliceSimulator
            background="#000000"
            sliceZone={({ slices, ...props }) => (
                <SliceZone {...props} components={slices as any} context={{ locale, i18n: english, prefetch: {} }} />
            )}
        />
    );
}
