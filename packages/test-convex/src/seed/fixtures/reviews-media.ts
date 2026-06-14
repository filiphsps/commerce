import type { Doc } from '../../../../convex/convex/_generated/dataModel';

/** `media` row sans system fields/timestamps and sans the `shop` ref (the seeder supplies the id). */
export type MediaSeed = Omit<Doc<'media'>, '_id' | '_creationTime' | 'shop' | 'createdAt' | 'updatedAt'>;

/** How many `reviews` rows to seed for the advanced shop (the table carries only `shopId` + timestamps). */
export const REVIEW_COUNT = 3;

/** Media library fixtures for the advanced shop. */
export const mediaFixtures: MediaSeed[] = [
    { alt: 'Atelier flat-lay of the core collection', caption: 'Spring lookbook hero' },
    { alt: 'Repair guarantee illustration', caption: 'Lifetime repair promise' },
    { alt: 'Stockholm studio portrait' },
];
