import type { RichTextField } from '@prismicio/client';

export interface HeaderModel {
    style: 'simple' | 'modern';
    announcements: Array<{
        location: 'above' | 'bellow';
        background_color: 'secondary' | 'primary';
        content: RichTextField;
    }>;
}
