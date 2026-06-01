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
export declare const api: {};

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
  };
};

export declare const components: {};
