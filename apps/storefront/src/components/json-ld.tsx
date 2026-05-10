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
        console.error(error);
        return null;
    }

    return <script type="application/ld+json">{serialized}</script>;
}
