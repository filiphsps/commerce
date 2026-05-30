import type { Field } from 'payload';
import type { FieldDescriptor } from './descriptors';

/**
 * Migration seam between the Convex-native field descriptors and the still
 * server-runtime-coupled collection configs.
 *
 * The descriptors model a relation target as a plain `string`, while the
 * collection runtime narrows it to its generated slug union. The two are
 * structurally identical at runtime — every descriptor property name and value
 * matches what the runtime expects — so this helper is an identity pass that
 * only reconciles the relation-target type. It exists solely so collection and
 * block configs keep compiling while they are ported off the legacy runtime;
 * once those configs are rebuilt on descriptors directly, this seam is deleted.
 *
 * @param fields - Descriptors and/or runtime field configs in source order.
 * @returns The same values typed as the runtime field array.
 *
 * @example
 * fields: toFieldConfigs(imageField({ name: 'logo' }), seoGroup());
 */
export const toFieldConfigs = (...fields: Array<Field | FieldDescriptor>): Field[] => fields as Field[];
