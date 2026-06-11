/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";
import type { GenericId as Id } from "convex/values";

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: {
  account: {
    profile: {
      get: FunctionReference<"query", "public", {}, any>;
    };
  };
  cms: {
    actions: {
      bulkDelete: FunctionReference<
        "mutation",
        "public",
        { documentIds: Array<Id<"cmsDocuments">> },
        any
      >;
      bulkPublish: FunctionReference<
        "mutation",
        "public",
        { documentIds: Array<Id<"cmsDocuments">> },
        any
      >;
      create: FunctionReference<
        "mutation",
        "public",
        { collection: string; data: any },
        any
      >;
      deleteDocument: FunctionReference<
        "mutation",
        "public",
        { documentId: Id<"cmsDocuments"> },
        any
      >;
      publish: FunctionReference<
        "mutation",
        "public",
        {
          collection: string;
          data: any;
          documentId?: string;
          keyField?: string;
          keyValue?: string;
        },
        any
      >;
      restoreVersion: FunctionReference<
        "mutation",
        "public",
        { versionId: Id<"cmsVersions"> },
        any
      >;
      saveDraft: FunctionReference<
        "mutation",
        "public",
        {
          baseVersionId?: string;
          collection: string;
          data: any;
          documentId?: string;
          keyField?: string;
          keyValue?: string;
        },
        any
      >;
    };
    documents: {
      get: FunctionReference<
        "query",
        "public",
        {
          collection: string;
          documentId?: string;
          keyField?: string;
          keyValue?: string;
        },
        any
      >;
      save: FunctionReference<
        "mutation",
        "public",
        {
          baseVersionId?: string;
          collection: string;
          data: any;
          documentId?: Id<"cmsDocuments">;
          status: "draft" | "published";
        },
        any
      >;
    };
    list: {
      list: FunctionReference<
        "query",
        "public",
        { collection: string; page?: number; pageSize?: number },
        any
      >;
    };
    media: {
      byId: FunctionReference<
        "query",
        "public",
        { mediaId: Id<"cmsMedia"> },
        any
      >;
      finalizeUpload: FunctionReference<
        "mutation",
        "public",
        {
          alt: string;
          caption?: string;
          filename: string;
          focal?: { x: number; y: number };
          mimeType: string;
          storageId: Id<"_storage">;
        },
        any
      >;
      generateUploadUrl: FunctionReference<"mutation", "public", {}, any>;
      list: FunctionReference<"query", "public", { limit?: number }, any>;
    };
    media_derivatives: {
      byMedia: FunctionReference<
        "query",
        "public",
        { mediaId: Id<"cmsMedia"> },
        any
      >;
      saveDerivatives: FunctionReference<
        "mutation",
        "public",
        {
          derivatives: Array<{
            height: number;
            size: "thumbnail" | "card" | "feature" | "hero";
            storageId: Id<"_storage">;
            width: number;
          }>;
          focal?: { x: number; y: number };
          mediaId: Id<"cmsMedia">;
          original: { height: number; width: number };
        },
        any
      >;
    };
    prosemirror: {
      getSnapshot: FunctionReference<
        "query",
        "public",
        { id: string; version?: number },
        { content: null } | { content: string; version: number }
      >;
      getSteps: FunctionReference<
        "query",
        "public",
        { id: string; version: number },
        any
      >;
      latestVersion: FunctionReference<
        "query",
        "public",
        { id: string },
        null | number
      >;
      submitSnapshot: FunctionReference<
        "mutation",
        "public",
        { content: string; id: string; version: number },
        null
      >;
      submitSteps: FunctionReference<
        "mutation",
        "public",
        {
          clientId: string | number;
          id: string;
          steps: Array<string>;
          version: number;
        },
        any
      >;
    };
    read: {
      articleBySlug: FunctionReference<
        "query",
        "public",
        {
          draft?: boolean;
          locale: string;
          serverSecret: string;
          shopId: string;
          slug: string;
        },
        any
      >;
      articles: FunctionReference<
        "query",
        "public",
        { locale: string; serverSecret: string; shopId: string; tag?: string },
        any
      >;
      collectionMetadataByHandle: FunctionReference<
        "query",
        "public",
        {
          draft?: boolean;
          handle: string;
          locale: string;
          serverSecret: string;
          shopId: string;
        },
        any
      >;
      pageBySlug: FunctionReference<
        "query",
        "public",
        {
          draft?: boolean;
          locale: string;
          serverSecret: string;
          shopId: string;
          slug: string;
        },
        any
      >;
      pages: FunctionReference<
        "query",
        "public",
        { locale: string; serverSecret: string; shopId: string },
        any
      >;
      productMetadataByHandle: FunctionReference<
        "query",
        "public",
        {
          draft?: boolean;
          handle: string;
          locale: string;
          serverSecret: string;
          shopId: string;
        },
        any
      >;
      recordDivergence: FunctionReference<
        "mutation",
        "public",
        {
          detail?: string;
          getter: string;
          key?: string;
          kind: "mismatch" | "error";
          locale: string;
          serverSecret: string;
          shop: string;
        },
        any
      >;
      singleton: FunctionReference<
        "query",
        "public",
        {
          collection: "header" | "footer" | "businessData";
          draft?: boolean;
          locale: string;
          serverSecret: string;
          shopId: string;
        },
        any
      >;
    };
    secrets: {
      readMaskedShop: FunctionReference<"query", "public", {}, any>;
    };
    versions: {
      list: FunctionReference<
        "query",
        "public",
        { documentId: Id<"cmsDocuments"> },
        any
      >;
      restore: FunctionReference<
        "mutation",
        "public",
        { versionId: Id<"cmsVersions"> },
        any
      >;
    };
  };
  db: {
    feature_flags: {
      byKey: FunctionReference<
        "query",
        "public",
        { key: string; serverSecret: string },
        any
      >;
      findAll: FunctionReference<
        "query",
        "public",
        { serverSecret: string },
        any
      >;
    };
    identities: {
      byId: FunctionReference<
        "query",
        "public",
        { id: string; serverSecret: string },
        any
      >;
      byProviderIdentity: FunctionReference<
        "query",
        "public",
        { identity: string; provider: string; serverSecret: string },
        any
      >;
      upsertByProviderIdentity: FunctionReference<
        "mutation",
        "public",
        {
          accessToken?: string;
          expiresAt?: number;
          identity: string;
          provider: string;
          refreshToken?: string;
          scope?: string;
          serverSecret: string;
          upsert?: boolean;
        },
        any
      >;
    };
    reviews: {
      byShop: FunctionReference<
        "query",
        "public",
        { count?: number; serverSecret: string; shopId: string },
        any
      >;
      findAll: FunctionReference<
        "query",
        "public",
        { serverSecret: string },
        any
      >;
    };
    sessions: {
      byId: FunctionReference<
        "query",
        "public",
        { id: string; serverSecret: string },
        any
      >;
      byToken: FunctionReference<
        "query",
        "public",
        { serverSecret: string; token: string },
        any
      >;
      create: FunctionReference<
        "mutation",
        "public",
        {
          expiresAt: number;
          serverSecret: string;
          token: string;
          userId: string;
        },
        any
      >;
      deleteByToken: FunctionReference<
        "mutation",
        "public",
        { serverSecret: string; token: string },
        any
      >;
    };
    shop_write: {
      upsertShop: FunctionReference<
        "mutation",
        "public",
        {
          collaborators?: Array<{ permissions: Array<string>; user: string }>;
          credentials?: { clientSecret?: string; token?: string };
          legacyId?: string;
          serverSecret: string;
          shop: {
            alternativeDomains?: Array<string>;
            commerce?: { maxQuantity?: number; processingTimeInDays?: number };
            commerceProvider?:
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
            description?: string;
            design?: {
              accents: Array<{
                color: string;
                foreground: string;
                type: "primary" | "secondary";
              }>;
              header: {
                logo: {
                  alt: string;
                  height: number;
                  src: string;
                  width: number;
                };
              };
            };
            domain?: string;
            i18n?: { defaultLocale: string };
            icons?: {
              favicon?: {
                alt: string;
                height: number;
                src: string;
                width: number;
              };
            };
            integrations?: { judgeme?: { publicToken?: string } };
            name?: string;
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
          };
          upsert?: boolean;
        },
        any
      >;
    };
    shops: {
      byCollaborator: FunctionReference<
        "query",
        "public",
        { serverSecret: string; userId: string },
        any
      >;
      byDomain: FunctionReference<
        "query",
        "public",
        { domain: string; serverSecret: string },
        any
      >;
      byDomainWithCredentials: FunctionReference<
        "query",
        "public",
        { domain: string; serverSecret: string },
        any
      >;
      byId: FunctionReference<
        "query",
        "public",
        { id: string; serverSecret: string },
        any
      >;
      findAll: FunctionReference<
        "query",
        "public",
        { serverSecret: string },
        any
      >;
    };
    users: {
      byEmail: FunctionReference<
        "query",
        "public",
        { email: string; serverSecret: string },
        any
      >;
      byId: FunctionReference<
        "query",
        "public",
        { id: string; serverSecret: string },
        any
      >;
      byProviderIdentity: FunctionReference<
        "query",
        "public",
        { identity: string; provider: string; serverSecret: string },
        any
      >;
      create: FunctionReference<
        "mutation",
        "public",
        {
          avatar?: string;
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
          serverSecret: string;
        },
        any
      >;
      pushIdentity: FunctionReference<
        "mutation",
        "public",
        {
          identity: {
            accessToken?: string;
            createdAt: number;
            expiresAt?: number;
            id: string;
            identity: string;
            provider: string;
            refreshToken?: string;
            scope?: string;
            updatedAt: number;
          };
          serverSecret: string;
          userId: string;
        },
        any
      >;
    };
  };
};

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: {
  cms: {
    actions: {
      principal: FunctionReference<
        "query",
        "internal",
        { shopId: Id<"shops"> },
        any
      >;
    };
    secrets: {
      sensitiveShopRead: FunctionReference<"query", "internal", {}, any>;
    };
  };
  crons: {
    exportSnapshot: FunctionReference<"action", "internal", {}, any>;
  };
  reconcile: {
    checksumPage: FunctionReference<
      "query",
      "internal",
      {
        paginationOpts: {
          cursor: string | null;
          endCursor?: string | null;
          id?: number;
          maximumBytesRead?: number;
          maximumRowsRead?: number;
          numItems: number;
        };
        table:
          | "shops"
          | "shopCredentials"
          | "shopDomains"
          | "shopFeatureFlags"
          | "featureFlags"
          | "reviews"
          | "cmsDocuments";
      },
      any
    >;
    recordParity: FunctionReference<
      "mutation",
      "internal",
      {
        actualCount: number;
        actualOnlySamples: Array<string>;
        actualRollup: string;
        collection: string;
        expectedCount: number;
        expectedOnlySamples: Array<string>;
        expectedRollup: string;
        runId: string;
        status: "match" | "mismatch";
      },
      any
    >;
    run: FunctionReference<
      "action",
      "internal",
      {
        expected: Array<{
          collection: string;
          count: number;
          docHashes?: Array<string>;
          rollup: string;
        }>;
        pageSize?: number;
        runId: string;
      },
      any
    >;
    runLedger: FunctionReference<"query", "internal", { runId: string }, any>;
  };
  revalidate: {
    delivery: {
      emitDeadLetterAlert: FunctionReference<
        "action",
        "internal",
        { collection: string; error: string; runId: string; tenantId: string },
        any
      >;
      enqueueDelivery: FunctionReference<
        "mutation",
        "internal",
        { pendingId: Id<"pendingRevalidations"> },
        any
      >;
      onDeliveryComplete: FunctionReference<
        "mutation",
        "internal",
        {
          result:
            | { returnValue: any; type: "success" }
            | { error: string; type: "failed" }
            | { type: "canceled" };
          runId: string;
        },
        any
      >;
    };
    idempotency: {
      coalesce: FunctionReference<
        "mutation",
        "internal",
        { collection: string; tags: Array<string>; tenantId: string },
        any
      >;
      recordEvent: FunctionReference<
        "mutation",
        "internal",
        { eventId: string },
        any
      >;
    };
    notify: {
      ackDelivery: FunctionReference<
        "mutation",
        "internal",
        { pendingId: Id<"pendingRevalidations"> },
        any
      >;
      loadDelivery: FunctionReference<
        "query",
        "internal",
        { pendingId: Id<"pendingRevalidations"> },
        any
      >;
      notify: FunctionReference<
        "action",
        "internal",
        { pendingId: Id<"pendingRevalidations"> },
        any
      >;
    };
    onPublish: {
      onPublish: FunctionReference<
        "mutation",
        "internal",
        {
          collection: string;
          eventId: string;
          key?: string;
          shopId: Id<"shops">;
        },
        any
      >;
    };
    reconcile: {
      listLostWindows: FunctionReference<
        "query",
        "internal",
        { limit: number; now: number; staleAfterMs: number },
        any
      >;
      reconcile: FunctionReference<"action", "internal", {}, any>;
    };
  };
};

export declare const components: {
  actionRetrier: import("@convex-dev/action-retrier/_generated/component.js").ComponentApi<"actionRetrier">;
  prosemirrorSync: import("@convex-dev/prosemirror-sync/_generated/component.js").ComponentApi<"prosemirrorSync">;
};
