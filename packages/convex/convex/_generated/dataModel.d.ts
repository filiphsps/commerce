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
  reviews: {
    document: {
      createdAt: number;
      shopId: string;
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
