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
  };
};

export declare const components: {
  actionRetrier: import("@convex-dev/action-retrier/_generated/component.js").ComponentApi<"actionRetrier">;
};
