// Block node shapes are owned by `@nordcom/commerce-cms` (it generates them
// from the Payload schema). Re-export them here so storefront block
// components have a single import surface and stay in lockstep with the CMS
// editor — these are types only, no runtime dependency on the CMS package's
// renderer components.
export type {
    AlertBlockNode,
    BannerBlockNode,
    BlockNode,
    CollectionBlockNode,
    ColumnsBlockNode,
    HtmlBlockNode,
    MediaGridBlockNode,
    MediaItem,
    OverviewBlockNode,
    RichTextBlockNode,
    VendorsBlockNode,
} from '@nordcom/commerce-cms/blocks/render';
