import { injectable } from 'inversify';
import Node from '../../node/Node';
import { QuorumSetMapper } from '../QuorumSetMapper';
import { QuorumSet as BaseQuorumSet } from '@stellarbeat/js-stellarbeat-shared/lib/quorum-set';
import NodeQuorumSet from '../../node/NodeQuorumSet';
import { TransitiveQuorumSetFinder } from '../TransitiveQuorumSetFinder';
import { QuorumSet } from '../QuorumSet';

@injectable()
export class NodesInTransitiveNetworkQuorumSetFinder {
	find(nodes: Node[], networkQuorumSetConfiguration: QuorumSet): Node[] {
		const baseQuorumSet = QuorumSetMapper.toBaseQuorumSet(
			networkQuorumSetConfiguration
		);
		const quorumSetMap = this.getNodesToQuorumSetMap(nodes);
		const transitiveQuorumSet = TransitiveQuorumSetFinder.find(
			baseQuorumSet,
			quorumSetMap
		);

		return nodes.filter((node) =>
			transitiveQuorumSet.has(node.publicKey.value)
		);
	}

	private getNodesToQuorumSetMap(nodes: Node[]) {
		return new Map<string, BaseQuorumSet>(
			nodes
				.filter((node) => node.quorumSet)
				.map((node) => [
					node.publicKey.value,
					(node.quorumSet as NodeQuorumSet).quorumSet
				])
		);
	}
}
