import { QuorumSet as QuorumSetDTO } from '@stellarbeat/js-stellarbeat-shared';

// finds the transitive quorum set for a given quorum set,
// meaning all the nodes reachable starting from the given quorum set
export class TransitiveQuorumSetFinder {
	static find(
		quorumSet: QuorumSetDTO,
		quorumSetMap: Map<string, QuorumSetDTO>
	) {
		return TransitiveQuorumSetFinder.findInternal(
			quorumSet,
			quorumSetMap,
			new Set<string>()
		);
	}

	private static findInternal(
		quorumSet: QuorumSetDTO,
		quorumSetMap: Map<string, QuorumSetDTO>,
		processedNodes: Set<string>
	) {
		quorumSet.validators.forEach((validator) => {
			if (!processedNodes.has(validator)) {
				processedNodes.add(validator);
				const quorumSet = quorumSetMap.get(validator);
				if (quorumSet) {
					this.findInternal(quorumSet, quorumSetMap, processedNodes);
				}
			}
		});

		quorumSet.innerQuorumSets.forEach((innerQuorumSet) => {
			this.findInternal(innerQuorumSet, quorumSetMap, processedNodes);
		});

		return processedNodes;
	}
}
