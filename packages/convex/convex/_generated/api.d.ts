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
      save: FunctionReference<
        "mutation",
        "public",
        {
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
