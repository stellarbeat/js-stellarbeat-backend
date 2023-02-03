import { QuorumSet } from '../../../network/QuorumSet';
import { QuorumSet as CrawlerQuorumSet } from '@stellarbeat/js-stellarbeat-shared';
import { QuorumSet as QuorumSetDTO } from '@stellarbeat/js-stellarbeat-shared/lib/quorum-set';
import {
	Ledger,
	NodeAddress as NodeAddressDTO
} from '@stellarbeat/js-stellar-node-crawler/lib/crawler';
import Node from '../../Node';
import { NodeAddress } from '../../NodeAddress';
import NodeQuorumSet from '../../NodeQuorumSet';

export class CrawlerDTOMapper {
	static toNetworkQuorumSetDTO(quorumSet: QuorumSet): CrawlerQuorumSet {
		const crawlerQuorumSet = new CrawlerQuorumSet();
		crawlerQuorumSet.validators = quorumSet.validators.map(
			(validator) => validator.value
		);
		crawlerQuorumSet.threshold = quorumSet.threshold;
		crawlerQuorumSet.innerQuorumSets = quorumSet.innerQuorumSets.map(
			(innerQuorumSet) => this.toNetworkQuorumSetDTO(innerQuorumSet)
		);

		return crawlerQuorumSet;
	}

	static mapNodeAddressesToNodeAddressDTOs(
		nodeAddress: NodeAddress[]
	): NodeAddressDTO[] {
		return nodeAddress.map((nodeAddress) => {
			return [nodeAddress.ip, nodeAddress.port];
		});
	}

	static mapNodeToNodeAddressDTOs(nodes: Node[]): NodeAddressDTO[] {
		return nodes.map((node) => {
			return [node.ip, node.port];
		});
	}

	static createQuorumSetDTOMap(nodes: Node[]): Map<string, QuorumSetDTO> {
		return new Map<string, QuorumSetDTO>(
			nodes
				.map((node) => node.quorumSet)
				.filter(
					(quorumSet): quorumSet is NodeQuorumSet =>
						quorumSet instanceof NodeQuorumSet
				)
				.map((quorumSet) => {
					return [quorumSet.hash, quorumSet.quorumSet];
				})
		);
	}

	static toLedgerDTO(
		ledger: bigint | null,
		closeTime: Date | null
	): Ledger | undefined {
		if (ledger !== null && closeTime !== null) {
			return {
				sequence: ledger,
				closeTime: closeTime
			};
		}
		return undefined;
	}
}
