import { QuorumSet } from '../../../network/QuorumSet';
import { QuorumSet as CrawlerQuorumSet } from '@stellarbeat/js-stellarbeat-shared';
import { QuorumSet as QuorumSetDTO } from '@stellarbeat/js-stellarbeat-shared/lib/quorum-set';
import { NodeAddress } from '@stellarbeat/js-stellar-node-crawler/lib/crawler';
import { CrawlNode } from './CrawlerService';
import Node from '../../Node';

export class CrawlerMapper {
	static toQuorumSetDTO(quorumSet: QuorumSet): CrawlerQuorumSet {
		const crawlerQuorumSet = new CrawlerQuorumSet();
		crawlerQuorumSet.validators = quorumSet.validators.map(
			(validator) => validator.value
		);
		crawlerQuorumSet.threshold = quorumSet.threshold;
		crawlerQuorumSet.innerQuorumSets = quorumSet.innerQuorumSets.map(
			(innerQuorumSet) => this.toQuorumSetDTO(innerQuorumSet)
		);

		return crawlerQuorumSet;
	}

	static mapToNodeAddressesSortedByNetworkQuorumSetInclusion(
		crawlNodes: CrawlNode[],
		networkQuorumSetConfiguration: CrawlerQuorumSet
	): NodeAddress[] {
		const sortedNodes = crawlNodes.sort((a) => {
			if (
				QuorumSetDTO.getAllValidators(networkQuorumSetConfiguration).includes(
					a.publicKey.value
				)
			)
				return -1;
			return 0;
		});

		return sortedNodes.map((node) => node.address);
	}

	static mapToCrawlNode(node: Node): CrawlNode {
		return {
			publicKey: node.publicKey,
			address: [node.ip, node.port],
			quorumSetHashKey: node.quorumSet ? node.quorumSet.hash : null,
			quorumSet: node.quorumSet ? node.quorumSet.quorumSet : null
		};
	}
}
