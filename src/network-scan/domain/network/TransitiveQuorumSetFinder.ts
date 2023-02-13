import { QuorumSet } from './QuorumSet';

//finds the transitive quorum set for a given quorum set,
// meaning all the nodes reachable starting from the given quorum set
export class TransitiveQuorumSetFinder {
	static find(quorumSet: QuorumSet, quorumSetMap: Map<string, QuorumSet>) {
		return TransitiveQuorumSetFinder.findInternal(
			quorumSet,
			quorumSetMap,
			new Set<string>()
		);
	}

	private static findInternal(
		quorumSet: QuorumSet,
		quorumSetMap: Map<string, QuorumSet>,
		processedNodes: Set<string>
	) {
		quorumSet.validators.forEach((validator) => {
			if (!processedNodes.has(validator.value)) {
				processedNodes.add(validator.value);
				const quorumSet = quorumSetMap.get(validator.value);
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
