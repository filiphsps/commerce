import { trace } from '@opentelemetry/api';

export type JsonLdProps = {
    data: Object;
};

export function JsonLd({ data }: JsonLdProps) {
    if (!data) {
        return null;
    }

    let serialized: string;
    try {
        serialized = JSON.stringify(data);
    } catch (error: unknown) {
        trace.getActiveSpan()?.addEvent('json_ld.serialization_failed', {
            'error.message': (error as Error)?.message ?? String(error),
        });
        return null;
    }

    return <script type="application/ld+json">{serialized}</script>;
}
