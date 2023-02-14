import Node from '../../Node';
import { NetworkQuorumSetConfiguration } from '../../../network/NetworkQuorumSetConfiguration';
import PublicKey from '../../PublicKey';

export class NodeSorter {
	static sortByNetworkQuorumSetInclusion(
		nodes: Node[],
		networkQuorumSet: NetworkQuorumSetConfiguration
	): Node[] {
		const publicKeys = NodeSorter.getAllValidators(networkQuorumSet);
		return nodes.sort((a) => {
			if (publicKeys.find((publicKey) => publicKey.equals(a.publicKey)))
				return -1;
			return 0;
		});
	}

	private static getAllValidators(
		quorumSet: NetworkQuorumSetConfiguration
	): PublicKey[] {
		return quorumSet.innerQuorumSets
			.reduce(
				(allValidators, innerQS) =>
					allValidators.concat(this.getAllValidators(innerQS)),
				quorumSet.validators
			)
			.map((publicKey) => publicKey);
	}
}
