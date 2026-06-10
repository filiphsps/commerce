import type { BlockDescriptor, FieldDescriptor } from '../descriptors/types';
import type { EditorConvexBridge, EditorRelationshipOption } from './runtime';

/**
 * Collects every collection slug a descriptor tree's `relationship` fields point at, recursing
 * through the container kinds (group/array/collapsible and each block variant of a blocks field).
 * Upload fields are deliberately excluded: the upload widget is a file picker, not an option list,
 * so its `relationTo` never needs a prefetched option set.
 *
 * @param fields - The descriptor tree to walk.
 * @returns The unique target slugs, sorted for deterministic prefetch ordering.
 */
export function relationshipTargetsOf(fields: FieldDescriptor[]): string[] {
    const targets = new Set<string>();
    const walk = (nodes: FieldDescriptor[]): void => {
        for (const node of nodes) {
            switch (node.type) {
                case 'relationship':
                    targets.add(node.relationTo);
                    break;
                case 'group':
                case 'array':
                case 'collapsible':
                    walk(node.fields);
                    break;
                case 'blocks':
                    for (const block of node.blocks as BlockDescriptor[]) walk(block.fields);
                    break;
                default:
                    break;
            }
        }
    };
    walk(fields);
    return [...targets].sort();
}

/**
 * Prefetches the relationship option sets a field surface needs, keyed by target collection slug —
 * the server-side half of the CMSGATE-02 live relationship transport. Options are loaded through
 * the bridge's bounded `listRelationshipOptions` Convex read and handed to `<EditorFields>` as
 * plain data, because the relationship widget's option source is synchronous and the prefetched map
 * is the only serializable shape that crosses the RSC boundary. A schema without relationship
 * fields issues zero Convex calls.
 *
 * @param bridge - The runtime's Convex bridge, or `undefined` on a runtime without one (test
 *   substrates) — which degrades to an empty map, the placeholder behavior.
 * @param fields - The collection's descriptor tree.
 * @returns The option sets keyed by `relationTo` slug.
 */
export async function loadRelationshipOptions(
    bridge: EditorConvexBridge | undefined,
    fields: FieldDescriptor[],
): Promise<Record<string, EditorRelationshipOption[]>> {
    if (!bridge) return {};
    const targets = relationshipTargetsOf(fields);
    const entries = await Promise.all(
        targets.map(async (relationTo) => [relationTo, await bridge.listRelationshipOptions({ relationTo })] as const),
    );
    return Object.fromEntries(entries);
}
