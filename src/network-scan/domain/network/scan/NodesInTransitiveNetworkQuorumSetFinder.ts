import { injectable } from 'inversify';
import Node from '../../node/Node';
import { NetworkQuorumSetConfigurationMapper } from '../NetworkQuorumSetConfigurationMapper';
import { QuorumSet as BaseQuorumSet } from '@stellarbeat/js-stellarbeat-shared/lib/quorum-set';
import NodeQuorumSet from '../../node/NodeQuorumSet';
import { NetworkQuorumSetConfiguration } from '../NetworkQuorumSetConfiguration';
import { TransitiveQuorumSetFinder } from '@stellarbeat/js-stellarbeat-shared';

@injectable()
export class NodesInTransitiveNetworkQuorumSetFinder {
	find(
		nodes: Node[],
		networkQuorumSetConfiguration: NetworkQuorumSetConfiguration
	): Node[] {
		const baseQuorumSet = NetworkQuorumSetConfigurationMapper.toBaseQuorumSet(
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
