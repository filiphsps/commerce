export type JsonLdProps = {
    data: Object;
};

export function JsonLd({ data }: JsonLdProps) {
    if (!(data as any)) {
        return null;
    }

    try {
        return <script type="application/ld+json">{JSON.stringify(data)}</script>;
    } catch (error: unknown) {
        console.error(error);
        return null;
    }
}
