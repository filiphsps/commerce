export type JsonLdProps = {
    data: Object;
};
export function JsonLd({ data }: JsonLdProps) {
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
