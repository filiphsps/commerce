/* eslint-disable */
/**
 * Generated data model types.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  DocumentByName,
  TableNamesInDataModel,
  SystemTableNames,
  AnyDataModel,
} from "convex/server";
import type { GenericId } from "convex/values";

/**
 * A type describing your Convex data model.
 *
 * This type includes information about what tables you have, the type of
 * documents stored in those tables, and the indexes defined on them.
 *
 * This type is used to parameterize methods like `queryGeneric` and
 * `mutationGeneric` to make them type-safe.
 */

export type DataModel = {
  articles: {
    document: {
      author: string;
      body?: any;
      cover?: string;
      createdAt: number;
      excerpt?: string;
      publishedAt?: string;
      seo?: {
        description?: string;
        image?: string;
        keywords?: Array<string>;
        noindex?: boolean;
        title?: string;
      };
      shop: string;
      slug: string;
      tags?: Array<string>;
      title: string;
      updatedAt: number;
      _id: Id<"articles">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "author"
      | "body"
      | "cover"
      | "createdAt"
      | "excerpt"
      | "publishedAt"
      | "seo"
      | "seo.description"
      | "seo.image"
      | "seo.keywords"
      | "seo.noindex"
      | "seo.title"
      | "shop"
      | "slug"
      | "tags"
      | "title"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_shop: ["shop", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  businessData: {
    document: {
      address?: {
        city?: string;
        country?: string;
        line1?: string;
        line2?: string;
        postalCode?: string;
        region?: string;
      };
      createdAt: number;
      legalName?: string;
      profiles?: Array<{ handle: string; platform: string; url?: string }>;
      shop: string;
      supportEmail?: string;
      supportPhone?: string;
      updatedAt: number;
      _id: Id<"businessData">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "address"
      | "address.city"
      | "address.country"
      | "address.line1"
      | "address.line2"
      | "address.postalCode"
      | "address.region"
      | "createdAt"
      | "legalName"
      | "profiles"
      | "shop"
      | "supportEmail"
      | "supportPhone"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_shop: ["shop", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  cms_i18n: {
    document: {
      createdAt: number;
      fieldPath: string;
      locale: string;
      parentId: Id<"cmsDocuments">;
      updatedAt: number;
      value: any;
      _id: Id<"cms_i18n">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "fieldPath"
      | "locale"
      | "parentId"
      | "updatedAt"
      | "value";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_parent_field: ["parentId", "fieldPath", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  cmsDocuments: {
    document: {
      collection: string;
      createdAt: number;
      data: any;
      latestVersionId?: Id<"cmsVersions">;
      publishedVersionId?: Id<"cmsVersions">;
      revision?: number;
      shopId: Id<"shops">;
      status: "draft" | "published";
      updatedAt: number;
      _id: Id<"cmsDocuments">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "collection"
      | "createdAt"
      | "data"
      | "latestVersionId"
      | "publishedVersionId"
      | "revision"
      | "shopId"
      | "status"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_shop: ["shopId", "_creationTime"];
      by_shop_collection: ["shopId", "collection", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  cmsMedia: {
    document: {
      alt: string;
      caption?: string;
      createdAt: number;
      filename: string;
      filesize: number;
      focalX?: number;
      focalY?: number;
      height?: number;
      mimeType: string;
      shopId: Id<"shops">;
      storageId: Id<"_storage">;
      updatedAt: number;
      width?: number;
      _id: Id<"cmsMedia">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "alt"
      | "caption"
      | "createdAt"
      | "filename"
      | "filesize"
      | "focalX"
      | "focalY"
      | "height"
      | "mimeType"
      | "shopId"
      | "storageId"
      | "updatedAt"
      | "width";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_shop: ["shopId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  cmsMediaDerivatives: {
    document: {
      createdAt: number;
      height?: number;
      mediaId: Id<"cmsMedia">;
      shopId: Id<"shops">;
      size: "thumbnail" | "card" | "feature" | "hero";
      status: "pending" | "ready";
      storageId?: Id<"_storage">;
      updatedAt: number;
      width?: number;
      _id: Id<"cmsMediaDerivatives">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "height"
      | "mediaId"
      | "shopId"
      | "size"
      | "status"
      | "storageId"
      | "updatedAt"
      | "width";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_media: ["mediaId", "size", "_creationTime"];
      by_shop: ["shopId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  cmsReadDivergence: {
    document: {
      createdAt: number;
      detail?: string;
      getter: string;
      key?: string;
      kind: "mismatch" | "error";
      locale: string;
      shop: string;
      _id: Id<"cmsReadDivergence">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "detail"
      | "getter"
      | "key"
      | "kind"
      | "locale"
      | "shop";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_getter: ["getter", "_creationTime"];
      by_shop: ["shop", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  cmsRichTextDocuments: {
    document: {
      documentId: string;
      fieldPath: string;
      locale: string;
      shopId: Id<"shops">;
      syncId: string;
      updatedAt: number;
      _id: Id<"cmsRichTextDocuments">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "documentId"
      | "fieldPath"
      | "locale"
      | "shopId"
      | "syncId"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_shop: ["shopId", "_creationTime"];
      by_sync_id: ["syncId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  cmsVersions: {
    document: {
      author?: { label: string; userId: Id<"users"> };
      collection: string;
      createdAt: number;
      documentId: Id<"cmsDocuments">;
      revision?: number;
      shopId: Id<"shops">;
      snapshot: any;
      status: "draft" | "published";
      _id: Id<"cmsVersions">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "author"
      | "author.label"
      | "author.userId"
      | "collection"
      | "createdAt"
      | "documentId"
      | "revision"
      | "shopId"
      | "snapshot"
      | "status";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_document: ["documentId", "_creationTime"];
      by_shop: ["shopId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  collectionMetadata: {
    document: {
      blocks?: Array<any>;
      createdAt: number;
      descriptionOverride?: any;
      seo?: {
        description?: string;
        image?: string;
        keywords?: Array<string>;
        noindex?: boolean;
        title?: string;
      };
      shop: string;
      shopifyHandle: string;
      updatedAt: number;
      _id: Id<"collectionMetadata">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "blocks"
      | "createdAt"
      | "descriptionOverride"
      | "seo"
      | "seo.description"
      | "seo.image"
      | "seo.keywords"
      | "seo.noindex"
      | "seo.title"
      | "shop"
      | "shopifyHandle"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_shop: ["shop", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  featureFlags: {
    document: {
      createdAt: number;
      defaultValue:
        | null
        | boolean
        | number
        | string
        | Array<any>
        | Record<string, any>;
      description?: string;
      key: string;
      kind?: "behavior" | "section";
      legacyId: string;
      options?: Array<{
        label: string;
        value:
          | null
          | boolean
          | number
          | string
          | Array<any>
          | Record<string, any>;
      }>;
      targeting: Array<{
        description?: string;
        params: Record<
          string,
          null | boolean | number | string | Array<any> | Record<string, any>
        >;
        rule: string;
        value:
          | null
          | boolean
          | number
          | string
          | Array<any>
          | Record<string, any>;
      }>;
      updatedAt: number;
      _id: Id<"featureFlags">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "defaultValue"
      | `defaultValue.${string}`
      | "description"
      | "key"
      | "kind"
      | "legacyId"
      | "options"
      | "targeting"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_key: ["key", "_creationTime"];
      by_legacy_id: ["legacyId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  footer: {
    document: {
      copyrightLine?: string;
      createdAt: number;
      legal?: Array<{
        link?: {
          article?: string;
          collectionRef?: string;
          kind?:
            | "page"
            | "article"
            | "product"
            | "collection"
            | "external"
            | "anchor";
          label?: string;
          openInNewTab?: boolean;
          page?: string;
          product?: string;
          url?: string;
        };
      }>;
      sections?: Array<{
        links?: Array<{
          link?: {
            article?: string;
            collectionRef?: string;
            kind?:
              | "page"
              | "article"
              | "product"
              | "collection"
              | "external"
              | "anchor";
            label?: string;
            openInNewTab?: boolean;
            page?: string;
            product?: string;
            url?: string;
          };
        }>;
        title: string;
      }>;
      shop: string;
      social?: Array<{
        platform:
          | "instagram"
          | "facebook"
          | "tiktok"
          | "youtube"
          | "x"
          | "linkedin";
        url: string;
      }>;
      updatedAt: number;
      _id: Id<"footer">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "copyrightLine"
      | "createdAt"
      | "legal"
      | "sections"
      | "shop"
      | "social"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_shop: ["shop", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  header: {
    document: {
      createdAt: number;
      cta?: {
        article?: string;
        collectionRef?: string;
        kind?:
          | "page"
          | "article"
          | "product"
          | "collection"
          | "external"
          | "anchor";
        label?: string;
        openInNewTab?: boolean;
        page?: string;
        product?: string;
        url?: string;
      };
      items?: Array<{
        backgroundColor?: string;
        description?: string;
        image?: string;
        items?: Array<{
          backgroundColor?: string;
          description?: string;
          image?: string;
          items?: Array<{
            backgroundColor?: string;
            description?: string;
            image?: string;
            items?: Array<{
              backgroundColor?: string;
              description?: string;
              image?: string;
              items?: Array<{
                backgroundColor?: string;
                description?: string;
                image?: string;
                items?: Array<{
                  backgroundColor?: string;
                  description?: string;
                  image?: string;
                  link?: {
                    article?: string;
                    collectionRef?: string;
                    kind?:
                      | "page"
                      | "article"
                      | "product"
                      | "collection"
                      | "external"
                      | "anchor";
                    label?: string;
                    openInNewTab?: boolean;
                    page?: string;
                    product?: string;
                    url?: string;
                  };
                }>;
                link?: {
                  article?: string;
                  collectionRef?: string;
                  kind?:
                    | "page"
                    | "article"
                    | "product"
                    | "collection"
                    | "external"
                    | "anchor";
                  label?: string;
                  openInNewTab?: boolean;
                  page?: string;
                  product?: string;
                  url?: string;
                };
              }>;
              link?: {
                article?: string;
                collectionRef?: string;
                kind?:
                  | "page"
                  | "article"
                  | "product"
                  | "collection"
                  | "external"
                  | "anchor";
                label?: string;
                openInNewTab?: boolean;
                page?: string;
                product?: string;
                url?: string;
              };
            }>;
            link?: {
              article?: string;
              collectionRef?: string;
              kind?:
                | "page"
                | "article"
                | "product"
                | "collection"
                | "external"
                | "anchor";
              label?: string;
              openInNewTab?: boolean;
              page?: string;
              product?: string;
              url?: string;
            };
          }>;
          link?: {
            article?: string;
            collectionRef?: string;
            kind?:
              | "page"
              | "article"
              | "product"
              | "collection"
              | "external"
              | "anchor";
            label?: string;
            openInNewTab?: boolean;
            page?: string;
            product?: string;
            url?: string;
          };
        }>;
        link?: {
          article?: string;
          collectionRef?: string;
          kind?:
            | "page"
            | "article"
            | "product"
            | "collection"
            | "external"
            | "anchor";
          label?: string;
          openInNewTab?: boolean;
          page?: string;
          product?: string;
          url?: string;
        };
        variant?: "editorial-columns" | "compact-list" | "featured-promo";
      }>;
      localeSwitcher?: { enabled?: boolean; label?: string };
      logo?: string;
      logoLink?: string;
      shop: string;
      updatedAt: number;
      _id: Id<"header">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "cta"
      | "cta.article"
      | "cta.collectionRef"
      | "cta.kind"
      | "cta.label"
      | "cta.openInNewTab"
      | "cta.page"
      | "cta.product"
      | "cta.url"
      | "items"
      | "localeSwitcher"
      | "localeSwitcher.enabled"
      | "localeSwitcher.label"
      | "logo"
      | "logoLink"
      | "shop"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_shop: ["shop", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  identities: {
    document: {
      accessToken?: string;
      createdAt: number;
      expiresAt?: number;
      identity: string;
      provider: string;
      refreshToken?: string;
      scope?: string;
      updatedAt: number;
      _id: Id<"identities">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "accessToken"
      | "createdAt"
      | "expiresAt"
      | "identity"
      | "provider"
      | "refreshToken"
      | "scope"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_provider_identity: ["provider", "identity", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  media: {
    document: {
      alt: string;
      caption?: string;
      createdAt: number;
      shop: string;
      updatedAt: number;
      _id: Id<"media">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "alt"
      | "caption"
      | "createdAt"
      | "shop"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_shop: ["shop", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  pages: {
    document: {
      blocks?: Array<any>;
      createdAt: number;
      seo?: {
        description?: string;
        image?: string;
        keywords?: Array<string>;
        noindex?: boolean;
        title?: string;
      };
      shop: string;
      slug: string;
      title: string;
      updatedAt: number;
      _id: Id<"pages">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "blocks"
      | "createdAt"
      | "seo"
      | "seo.description"
      | "seo.image"
      | "seo.keywords"
      | "seo.noindex"
      | "seo.title"
      | "shop"
      | "slug"
      | "title"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_shop: ["shop", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  pendingRevalidations: {
    document: {
      collection: string;
      scheduledJobId?: Id<"_scheduled_functions">;
      tags: Array<string>;
      tenantId: string;
      _id: Id<"pendingRevalidations">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "collection"
      | "scheduledJobId"
      | "tags"
      | "tenantId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_tenant_collection: ["tenantId", "collection", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  productMetadata: {
    document: {
      blocks?: Array<any>;
      createdAt: number;
      descriptionOverride?: any;
      seo?: {
        description?: string;
        image?: string;
        keywords?: Array<string>;
        noindex?: boolean;
        title?: string;
      };
      shop: string;
      shopifyHandle: string;
      updatedAt: number;
      _id: Id<"productMetadata">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "blocks"
      | "createdAt"
      | "descriptionOverride"
      | "seo"
      | "seo.description"
      | "seo.image"
      | "seo.keywords"
      | "seo.noindex"
      | "seo.title"
      | "shop"
      | "shopifyHandle"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_shop: ["shop", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  reconciliationLedger: {
    document: {
      actualCount: number;
      actualOnlySamples: Array<string>;
      actualRollup: string;
      collection: string;
      expectedCount: number;
      expectedOnlySamples: Array<string>;
      expectedRollup: string;
      recordedAt: number;
      runId: string;
      status: "match" | "mismatch";
      _id: Id<"reconciliationLedger">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "actualCount"
      | "actualOnlySamples"
      | "actualRollup"
      | "collection"
      | "expectedCount"
      | "expectedOnlySamples"
      | "expectedRollup"
      | "recordedAt"
      | "runId"
      | "status";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_collection: ["collection", "_creationTime"];
      by_run: ["runId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  revalidationDeadLetters: {
    document: {
      collection: string;
      deadLetteredAt: number;
      error: string;
      pendingId: Id<"pendingRevalidations">;
      runId: string;
      tags: Array<string>;
      tenantId: string;
      _id: Id<"revalidationDeadLetters">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "collection"
      | "deadLetteredAt"
      | "error"
      | "pendingId"
      | "runId"
      | "tags"
      | "tenantId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_tenant_collection: ["tenantId", "collection", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  revalidationDeliveries: {
    document: {
      collection: string;
      pendingId: Id<"pendingRevalidations">;
      runId: string;
      tags: Array<string>;
      tenantId: string;
      _id: Id<"revalidationDeliveries">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "collection"
      | "pendingId"
      | "runId"
      | "tags"
      | "tenantId";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_run_id: ["runId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  revalidationEvents: {
    document: {
      eventId: string;
      seenAt: number;
      _id: Id<"revalidationEvents">;
      _creationTime: number;
    };
    fieldPaths: "_creationTime" | "_id" | "eventId" | "seenAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_eventId: ["eventId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  reviews: {
    document: {
      createdAt: number;
      shopId: Id<"shops">;
      updatedAt: number;
      _id: Id<"reviews">;
      _creationTime: number;
    };
    fieldPaths: "_creationTime" | "_id" | "createdAt" | "shopId" | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_shop: ["shopId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  sessions: {
    document: {
      createdAt: number;
      expiresAt: number;
      token: string;
      updatedAt: number;
      user: Id<"users">;
      _id: Id<"sessions">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "createdAt"
      | "expiresAt"
      | "token"
      | "updatedAt"
      | "user";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_expiry: ["expiresAt", "_creationTime"];
      by_token: ["token", "_creationTime"];
      by_user: ["user", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  shopCollaborators: {
    document: {
      permissions: Array<string>;
      shop: Id<"shops">;
      user: Id<"users">;
      _id: Id<"shopCollaborators">;
      _creationTime: number;
    };
    fieldPaths: "_creationTime" | "_id" | "permissions" | "shop" | "user";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_shop: ["shop", "_creationTime"];
      by_shop_user: ["shop", "user", "_creationTime"];
      by_user: ["user", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  shopCredentials: {
    document: {
      clientSecret?: string;
      shop: Id<"shops">;
      token?: string;
      _id: Id<"shopCredentials">;
      _creationTime: number;
    };
    fieldPaths: "_creationTime" | "_id" | "clientSecret" | "shop" | "token";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_shop: ["shop", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  shopDomains: {
    document: {
      domain: string;
      lastCheckedAt?: number;
      shop: Id<"shops">;
      status?: "pending" | "verified" | "failed";
      verifiedAt?: number;
      via?: "vercel" | "service_domain" | "localhost";
      _id: Id<"shopDomains">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "domain"
      | "lastCheckedAt"
      | "shop"
      | "status"
      | "verifiedAt"
      | "via";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_domain: ["domain", "_creationTime"];
      by_shop: ["shop", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  shopFeatureFlags: {
    document: {
      flag: Id<"featureFlags">;
      shop: Id<"shops">;
      _id: Id<"shopFeatureFlags">;
      _creationTime: number;
    };
    fieldPaths: "_creationTime" | "_id" | "flag" | "shop";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_shop: ["shop", "_creationTime"];
      by_shop_flag: ["shop", "flag", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  shops: {
    document: {
      alternativeDomains?: Array<string>;
      commerce?: { maxQuantity?: number; processingTimeInDays?: number };
      commerceProvider:
        | {
            authentication: {
              customers?: { clientId: string; id: string };
              domain?: string;
              publicToken: string;
            };
            domain: string;
            id: string;
            storefrontId: string;
            type: "shopify";
          }
        | { authentication: {}; type: "stripe" };
      createdAt: number;
      description?: string;
      design: {
        accents: Array<{
          color: string;
          foreground: string;
          type: "primary" | "secondary";
        }>;
        header: {
          logo: { alt: string; height: number; src: string; width: number };
        };
      };
      domain: string;
      i18n?: { defaultLocale: string };
      icons?: {
        favicon?: { alt: string; height: number; src: string; width: number };
      };
      integrations?: { judgeme?: { publicToken?: string } };
      legacyId: string;
      name: string;
      showProductVendor?: boolean;
      theme?: {
        colors?: {
          accentPrimaryDark?: string;
          accentPrimaryLight?: string;
          accentSecondaryDark?: string;
          accentSecondaryLight?: string;
          accents?: Array<{
            color: string;
            foreground: string;
            type: "primary" | "secondary";
          }>;
          background?: string;
          border?: { default?: string; strong?: string };
          focusRing?: string;
          foreground?: string;
          state?: {
            danger?: string;
            info?: string;
            sale?: string;
            success?: string;
          };
          surface?: { base?: string; raised?: string; sunken?: string };
          text?: { default?: string; muted?: string };
        };
        elevation?: { card?: string; cardHover?: string; panel?: string };
        productCard?: {
          aspectHorizontal?: string;
          aspectHorizontalSquare?: string;
          aspectMicro?: string;
          aspectVertical?: string;
          bg?: string;
          borderColor?: string;
          borderWidth?: string;
          chipActiveBg?: string;
          chipActiveColor?: string;
          chipBg?: string;
          chipBorder?: string;
          chipColor?: string;
          chipPaddingX?: string;
          chipPaddingY?: string;
          compareColor?: string;
          ctaBg?: string;
          ctaColor?: string;
          ctaHeight?: string;
          ctaInlineStyle?: string;
          ctaPaddingY?: string;
          ctaPillIcon?: string;
          ctaPillLabel?: string;
          ctaPillPosition?: string;
          ctaPillReveal?: string;
          ctaPlacement?: string;
          ctaRadius?: string;
          eyebrowTracking?: string;
          fastPathDot?: string;
          fastPathSingleVariant?: string;
          gap?: string;
          gridAlign?: string;
          imageFit?: string;
          imageHoverSwap?: string;
          imagePadding?: string;
          imageRadius?: string;
          imageSizes?: string;
          maxWidth?: string;
          minWidth?: string;
          moreBg?: string;
          moreColor?: string;
          moreMinSize?: string;
          moreSize?: string;
          moreWeight?: number;
          motionBase?: string;
          motionEase?: string;
          motionFast?: string;
          motionHoverDuration?: string;
          motionHoverEase?: string;
          motionImageSwapDuration?: string;
          motionOverlayInDuration?: string;
          motionOverlayInEase?: string;
          motionPickerIn?: string;
          motionPickerOut?: string;
          oosImageSaturate?: number;
          oosOpacity?: number;
          overlayBg?: string;
          overlayBorderColor?: string;
          overlayMaxHeight?: string;
          overlayPadding?: string;
          overlayRadius?: string;
          overlayShadow?: string;
          overlayWidth?: string;
          padding?: string;
          priceColor?: string;
          priceSize?: string;
          priceWeight?: number;
          quickAddPresentation?: string;
          radius?: string;
          saleBadgeAllowOverlap?: boolean;
          saleBadgeMinDiscount?: number;
          saleBadgePosition?: string;
          saleBadgeStyle?: string;
          saleBadgeText?: string;
          saleCurrentColor?: string;
          saleShowSavingsLine?: string;
          saleStrikeAngle?: string;
          saleStrikeColor?: string;
          saleStrikeExtend?: string;
          saleStyle?: string;
          searchImageWidth?: string;
          shadow?: string;
          shadowHover?: string;
          swatchGap?: string;
          swatchHitPadding?: string;
          swatchRingColor?: string;
          swatchSize?: string;
          titleColor?: string;
          titleLineClamp?: number;
          titleSize?: string;
          titleWeight?: number;
          urgencyColor?: string;
          urgencyThreshold?: number;
          vendorColor?: string;
          vendorSize?: string;
        };
        radii?: {
          block?: string;
          blockLarge?: string;
          blockSmall?: string;
          blockTiny?: string;
        };
        spacing?: { blockPadding?: string; blockSpacer?: string };
        typography?: {
          fontFamily?: string;
          fontWeights?: {
            bold?: number;
            medium?: number;
            normal?: number;
            semibold?: number;
          };
          headingFamily?: string;
          scale?: {
            base?: string;
            lg?: string;
            sm?: string;
            xl?: string;
            xs?: string;
          };
        };
      };
      thirdParty?: { googleTagManager?: string; intercom?: string };
      updatedAt: number;
      _id: Id<"shops">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "alternativeDomains"
      | "commerce"
      | "commerce.maxQuantity"
      | "commerce.processingTimeInDays"
      | "commerceProvider"
      | "commerceProvider.authentication"
      | "commerceProvider.authentication.customers"
      | "commerceProvider.authentication.customers.clientId"
      | "commerceProvider.authentication.customers.id"
      | "commerceProvider.authentication.domain"
      | "commerceProvider.authentication.publicToken"
      | "commerceProvider.domain"
      | "commerceProvider.id"
      | "commerceProvider.storefrontId"
      | "commerceProvider.type"
      | "createdAt"
      | "description"
      | "design"
      | "design.accents"
      | "design.header"
      | "design.header.logo"
      | "design.header.logo.alt"
      | "design.header.logo.height"
      | "design.header.logo.src"
      | "design.header.logo.width"
      | "domain"
      | "i18n"
      | "i18n.defaultLocale"
      | "icons"
      | "icons.favicon"
      | "icons.favicon.alt"
      | "icons.favicon.height"
      | "icons.favicon.src"
      | "icons.favicon.width"
      | "integrations"
      | "integrations.judgeme"
      | "integrations.judgeme.publicToken"
      | "legacyId"
      | "name"
      | "showProductVendor"
      | "theme"
      | "theme.colors"
      | "theme.colors.accentPrimaryDark"
      | "theme.colors.accentPrimaryLight"
      | "theme.colors.accents"
      | "theme.colors.accentSecondaryDark"
      | "theme.colors.accentSecondaryLight"
      | "theme.colors.background"
      | "theme.colors.border"
      | "theme.colors.border.default"
      | "theme.colors.border.strong"
      | "theme.colors.focusRing"
      | "theme.colors.foreground"
      | "theme.colors.state"
      | "theme.colors.state.danger"
      | "theme.colors.state.info"
      | "theme.colors.state.sale"
      | "theme.colors.state.success"
      | "theme.colors.surface"
      | "theme.colors.surface.base"
      | "theme.colors.surface.raised"
      | "theme.colors.surface.sunken"
      | "theme.colors.text"
      | "theme.colors.text.default"
      | "theme.colors.text.muted"
      | "theme.elevation"
      | "theme.elevation.card"
      | "theme.elevation.cardHover"
      | "theme.elevation.panel"
      | "theme.productCard"
      | "theme.productCard.aspectHorizontal"
      | "theme.productCard.aspectHorizontalSquare"
      | "theme.productCard.aspectMicro"
      | "theme.productCard.aspectVertical"
      | "theme.productCard.bg"
      | "theme.productCard.borderColor"
      | "theme.productCard.borderWidth"
      | "theme.productCard.chipActiveBg"
      | "theme.productCard.chipActiveColor"
      | "theme.productCard.chipBg"
      | "theme.productCard.chipBorder"
      | "theme.productCard.chipColor"
      | "theme.productCard.chipPaddingX"
      | "theme.productCard.chipPaddingY"
      | "theme.productCard.compareColor"
      | "theme.productCard.ctaBg"
      | "theme.productCard.ctaColor"
      | "theme.productCard.ctaHeight"
      | "theme.productCard.ctaInlineStyle"
      | "theme.productCard.ctaPaddingY"
      | "theme.productCard.ctaPillIcon"
      | "theme.productCard.ctaPillLabel"
      | "theme.productCard.ctaPillPosition"
      | "theme.productCard.ctaPillReveal"
      | "theme.productCard.ctaPlacement"
      | "theme.productCard.ctaRadius"
      | "theme.productCard.eyebrowTracking"
      | "theme.productCard.fastPathDot"
      | "theme.productCard.fastPathSingleVariant"
      | "theme.productCard.gap"
      | "theme.productCard.gridAlign"
      | "theme.productCard.imageFit"
      | "theme.productCard.imageHoverSwap"
      | "theme.productCard.imagePadding"
      | "theme.productCard.imageRadius"
      | "theme.productCard.imageSizes"
      | "theme.productCard.maxWidth"
      | "theme.productCard.minWidth"
      | "theme.productCard.moreBg"
      | "theme.productCard.moreColor"
      | "theme.productCard.moreMinSize"
      | "theme.productCard.moreSize"
      | "theme.productCard.moreWeight"
      | "theme.productCard.motionBase"
      | "theme.productCard.motionEase"
      | "theme.productCard.motionFast"
      | "theme.productCard.motionHoverDuration"
      | "theme.productCard.motionHoverEase"
      | "theme.productCard.motionImageSwapDuration"
      | "theme.productCard.motionOverlayInDuration"
      | "theme.productCard.motionOverlayInEase"
      | "theme.productCard.motionPickerIn"
      | "theme.productCard.motionPickerOut"
      | "theme.productCard.oosImageSaturate"
      | "theme.productCard.oosOpacity"
      | "theme.productCard.overlayBg"
      | "theme.productCard.overlayBorderColor"
      | "theme.productCard.overlayMaxHeight"
      | "theme.productCard.overlayPadding"
      | "theme.productCard.overlayRadius"
      | "theme.productCard.overlayShadow"
      | "theme.productCard.overlayWidth"
      | "theme.productCard.padding"
      | "theme.productCard.priceColor"
      | "theme.productCard.priceSize"
      | "theme.productCard.priceWeight"
      | "theme.productCard.quickAddPresentation"
      | "theme.productCard.radius"
      | "theme.productCard.saleBadgeAllowOverlap"
      | "theme.productCard.saleBadgeMinDiscount"
      | "theme.productCard.saleBadgePosition"
      | "theme.productCard.saleBadgeStyle"
      | "theme.productCard.saleBadgeText"
      | "theme.productCard.saleCurrentColor"
      | "theme.productCard.saleShowSavingsLine"
      | "theme.productCard.saleStrikeAngle"
      | "theme.productCard.saleStrikeColor"
      | "theme.productCard.saleStrikeExtend"
      | "theme.productCard.saleStyle"
      | "theme.productCard.searchImageWidth"
      | "theme.productCard.shadow"
      | "theme.productCard.shadowHover"
      | "theme.productCard.swatchGap"
      | "theme.productCard.swatchHitPadding"
      | "theme.productCard.swatchRingColor"
      | "theme.productCard.swatchSize"
      | "theme.productCard.titleColor"
      | "theme.productCard.titleLineClamp"
      | "theme.productCard.titleSize"
      | "theme.productCard.titleWeight"
      | "theme.productCard.urgencyColor"
      | "theme.productCard.urgencyThreshold"
      | "theme.productCard.vendorColor"
      | "theme.productCard.vendorSize"
      | "theme.radii"
      | "theme.radii.block"
      | "theme.radii.blockLarge"
      | "theme.radii.blockSmall"
      | "theme.radii.blockTiny"
      | "theme.spacing"
      | "theme.spacing.blockPadding"
      | "theme.spacing.blockSpacer"
      | "theme.typography"
      | "theme.typography.fontFamily"
      | "theme.typography.fontWeights"
      | "theme.typography.fontWeights.bold"
      | "theme.typography.fontWeights.medium"
      | "theme.typography.fontWeights.normal"
      | "theme.typography.fontWeights.semibold"
      | "theme.typography.headingFamily"
      | "theme.typography.scale"
      | "theme.typography.scale.base"
      | "theme.typography.scale.lg"
      | "theme.typography.scale.sm"
      | "theme.typography.scale.xl"
      | "theme.typography.scale.xs"
      | "thirdParty"
      | "thirdParty.googleTagManager"
      | "thirdParty.intercom"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_legacy_id: ["legacyId", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
  users: {
    document: {
      avatar?: string;
      createdAt: number;
      email: string;
      emailVerified: number | null;
      groups?: Array<string>;
      identities: Array<{
        accessToken?: string;
        createdAt: number;
        expiresAt?: number;
        id: string;
        identity: string;
        provider: string;
        refreshToken?: string;
        scope?: string;
        updatedAt: number;
      }>;
      name: string;
      updatedAt: number;
      _id: Id<"users">;
      _creationTime: number;
    };
    fieldPaths:
      | "_creationTime"
      | "_id"
      | "avatar"
      | "createdAt"
      | "email"
      | "emailVerified"
      | "groups"
      | "identities"
      | "name"
      | "updatedAt";
    indexes: {
      by_id: ["_id"];
      by_creation_time: ["_creationTime"];
      by_email: ["email", "_creationTime"];
    };
    searchIndexes: {};
    vectorIndexes: {};
  };
};

/**
 * The names of all of your Convex tables.
 */
export type TableNames = TableNamesInDataModel<DataModel>;

/**
 * The type of a document stored in Convex.
 *
 * @typeParam TableName - A string literal type of the table name (like "users").
 */
export type Doc<TableName extends TableNames> = DocumentByName<
  DataModel,
  TableName
>;

/**
 * An identifier for a document in Convex.
 *
 * Convex documents are uniquely identified by their `Id`, which is accessible
 * on the `_id` field. To learn more, see [Document IDs](https://docs.convex.dev/using/document-ids).
 *
 * Documents can be loaded using `db.get(tableName, id)` in query and mutation functions.
 *
 * IDs are just strings at runtime, but this type can be used to distinguish them from other
 * strings when type checking.
 *
 * @typeParam TableName - A string literal type of the table name (like "users").
 */
export type Id<TableName extends TableNames | SystemTableNames> =
  GenericId<TableName>;
