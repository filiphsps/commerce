import { CollectionCards as CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1 } from '@payloadcms/next/rsc';
import {
    AssignTenantFieldTrigger as AssignTenantFieldTrigger_1d0591e3cf4f332c83a86da13a0de59a,
    TenantField as TenantField_1d0591e3cf4f332c83a86da13a0de59a,
    WatchTenantCollection as WatchTenantCollection_1d0591e3cf4f332c83a86da13a0de59a,
} from '@payloadcms/plugin-multi-tenant/client';
import {
    GlobalViewRedirect as GlobalViewRedirect_d6d5f193a167989e2ee7d14202901e62,
    TenantSelectionProvider as TenantSelectionProvider_d6d5f193a167989e2ee7d14202901e62,
    TenantSelector as TenantSelector_d6d5f193a167989e2ee7d14202901e62,
} from '@payloadcms/plugin-multi-tenant/rsc';
import {
    AlignFeatureClient as AlignFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    BlockquoteFeatureClient as BlockquoteFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    BoldFeatureClient as BoldFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    ChecklistFeatureClient as ChecklistFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    HeadingFeatureClient as HeadingFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    HorizontalRuleFeatureClient as HorizontalRuleFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    IndentFeatureClient as IndentFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    InlineCodeFeatureClient as InlineCodeFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    InlineToolbarFeatureClient as InlineToolbarFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    ItalicFeatureClient as ItalicFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    LinkFeatureClient as LinkFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    OrderedListFeatureClient as OrderedListFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    ParagraphFeatureClient as ParagraphFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    RelationshipFeatureClient as RelationshipFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    StrikethroughFeatureClient as StrikethroughFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    SubscriptFeatureClient as SubscriptFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    SuperscriptFeatureClient as SuperscriptFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    UnderlineFeatureClient as UnderlineFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    UnorderedListFeatureClient as UnorderedListFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    UploadFeatureClient as UploadFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
} from '@payloadcms/richtext-lexical/client';
import {
    LexicalDiffComponent as LexicalDiffComponent_44fe37237e0ebf4470c9990d8cb7b07e,
    RscEntryLexicalCell as RscEntryLexicalCell_44fe37237e0ebf4470c9990d8cb7b07e,
    RscEntryLexicalField as RscEntryLexicalField_44fe37237e0ebf4470c9990d8cb7b07e,
} from '@payloadcms/richtext-lexical/rsc';

/** @type import('payload').ImportMap */
export const importMap = {
    '@payloadcms/plugin-multi-tenant/client#WatchTenantCollection':
        WatchTenantCollection_1d0591e3cf4f332c83a86da13a0de59a,
    '@payloadcms/plugin-multi-tenant/client#TenantField': TenantField_1d0591e3cf4f332c83a86da13a0de59a,
    '@payloadcms/plugin-multi-tenant/client#AssignTenantFieldTrigger':
        AssignTenantFieldTrigger_1d0591e3cf4f332c83a86da13a0de59a,
    '@payloadcms/richtext-lexical/rsc#RscEntryLexicalCell': RscEntryLexicalCell_44fe37237e0ebf4470c9990d8cb7b07e,
    '@payloadcms/richtext-lexical/rsc#RscEntryLexicalField': RscEntryLexicalField_44fe37237e0ebf4470c9990d8cb7b07e,
    '@payloadcms/richtext-lexical/rsc#LexicalDiffComponent': LexicalDiffComponent_44fe37237e0ebf4470c9990d8cb7b07e,
    '@payloadcms/richtext-lexical/client#InlineToolbarFeatureClient':
        InlineToolbarFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#HorizontalRuleFeatureClient':
        HorizontalRuleFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#UploadFeatureClient': UploadFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#BlockquoteFeatureClient':
        BlockquoteFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#RelationshipFeatureClient':
        RelationshipFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#LinkFeatureClient': LinkFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#ChecklistFeatureClient':
        ChecklistFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#OrderedListFeatureClient':
        OrderedListFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#UnorderedListFeatureClient':
        UnorderedListFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#IndentFeatureClient': IndentFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#AlignFeatureClient': AlignFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#HeadingFeatureClient': HeadingFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#ParagraphFeatureClient':
        ParagraphFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#InlineCodeFeatureClient':
        InlineCodeFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#SuperscriptFeatureClient':
        SuperscriptFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#SubscriptFeatureClient':
        SubscriptFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#StrikethroughFeatureClient':
        StrikethroughFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#UnderlineFeatureClient':
        UnderlineFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#BoldFeatureClient': BoldFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/richtext-lexical/client#ItalicFeatureClient': ItalicFeatureClient_e70f5e05f09f93e00b997edb1ef0c864,
    '@payloadcms/plugin-multi-tenant/rsc#GlobalViewRedirect': GlobalViewRedirect_d6d5f193a167989e2ee7d14202901e62,
    '@payloadcms/plugin-multi-tenant/rsc#TenantSelector': TenantSelector_d6d5f193a167989e2ee7d14202901e62,
    '@payloadcms/plugin-multi-tenant/rsc#TenantSelectionProvider':
        TenantSelectionProvider_d6d5f193a167989e2ee7d14202901e62,
    '@payloadcms/next/rsc#CollectionCards': CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1,
};
