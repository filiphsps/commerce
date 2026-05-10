export interface PageModel {
    type?: string;
    title: string;
    description?: string;
    keywords?: string;
    slices?: Array<{
        type: string;
        data?: unknown;
    }>;
    body?: unknown;
}
