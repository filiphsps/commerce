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
