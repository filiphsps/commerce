import { trace } from '@opentelemetry/api';

export type JsonLdProps = {
    data: Object;
};

/**
 * Renders a JSON-LD `<script>` tag from a plain object.
 *
 * @param props.data - Structured data object serialized to JSON for injection into the page.
 * @returns The inline script element, or `null` when `data` is falsy or fails serialization.
 */
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
