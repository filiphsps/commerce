'use client';

import { DefaultLocale } from '@/utils/locale';
import { RemoveInvalidProps } from '@/utils/remove-invalid-props';
import { SliceSimulator } from '@slicemachine/adapter-next/simulator';
import { SliceZone } from '@prismicio/react';
import { components as slices } from '@/slices';

/**
 * You can probably ignore this page. It renders the Slice simulator
 * that appear in Slice Machine.
 */
export default function SliceSimulatorPage() {
    return (
        <SliceSimulator
            // The "sliceZone" prop should be a function receiving Slices and
            // rendering them using your "SliceZone" component.
            sliceZone={(props) => (
                <SliceZone {...RemoveInvalidProps(props)} components={slices} context={{ locale: DefaultLocale() }} />
            )}
        />
    );
}
