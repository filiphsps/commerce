'use client';

import { components as slices } from '@/slices';
import { DefaultLocale } from '@/utils/locale';
import { RemoveInvalidProps } from '@/utils/remove-invalid-props';
import { SliceZone } from '@prismicio/react';
import { SliceSimulator } from '@slicemachine/adapter-next/simulator';

/**
 * You can probably ignore this page. It renders the Slice simulator
 * that appear in Slice Machine.
 */
export default function SliceSimulatorPage() {
    const locale = DefaultLocale();

    return (
        <SliceSimulator
            // The "sliceZone" prop should be a function receiving Slices and
            // rendering them using your "SliceZone" component.
            sliceZone={(props) => <SliceZone {...RemoveInvalidProps(props)} components={slices} context={{ locale }} />}
        />
    );
}
