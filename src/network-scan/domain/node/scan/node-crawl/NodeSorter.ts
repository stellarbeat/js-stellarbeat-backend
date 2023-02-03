import Node from '../../Node';
import { QuorumSet } from '../../../network/QuorumSet';
import PublicKey from '../../PublicKey';

export class NodeSorter {
	static sortByNetworkQuorumSetInclusion(
		nodes: Node[],
		networkQuorumSet: QuorumSet
	): Node[] {
		const publicKeys = NodeSorter.getAllValidators(networkQuorumSet);
		return nodes.sort((a) => {
			if (publicKeys.find((publicKey) => publicKey.equals(a.publicKey)))
				return -1;
			return 0;
		});
	}

	private static getAllValidators(quorumSet: QuorumSet): PublicKey[] {
		return quorumSet.innerQuorumSets
			.reduce(
				(allValidators, innerQS) =>
					allValidators.concat(this.getAllValidators(innerQS)),
				quorumSet.validators
			)
			.map((publicKey) => publicKey);
	}
}
