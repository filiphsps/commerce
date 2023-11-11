import type { RichTextField } from '@prismicio/client';

export interface HeaderModel {
    announcements: Array<{
        location: 'above' | 'bellow';
        background_color: 'secondary' | 'primary';
        content: RichTextField;
    }>;
}
