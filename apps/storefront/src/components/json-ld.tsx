import 'server-only';

export type JsonLdProps = {
    data: Object;
};

export function JsonLd({ data }: JsonLdProps) {
    if (!(data as any)) {
        return null;
    }

    try {
        return (
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(data)
                }}
            />
        );
    } catch (error: unknown) {
        console.error(error);
        return null;
    }
}
