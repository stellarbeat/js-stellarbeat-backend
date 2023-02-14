import { QuorumSet as QuorumSetDTO } from '@stellarbeat/js-stellarbeat-shared/lib/quorum-set';
import {
	Ledger,
	NodeAddress as NodeAddressDTO
} from '@stellarbeat/js-stellar-node-crawler/lib/crawler';
import Node from '../../Node';
import { NodeAddress } from '../../NodeAddress';
import NodeQuorumSet from '../../NodeQuorumSet';

export class CrawlerDTOMapper {
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
