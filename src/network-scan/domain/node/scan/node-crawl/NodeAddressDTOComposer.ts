import Node from '../../Node';
import { NodeAddress } from '../../NodeAddress';
import { NodeAddress as NodeAddressDTO } from '@stellarbeat/js-stellar-node-crawler/lib/node-address';
import { NetworkQuorumSetConfiguration } from '../../../network/NetworkQuorumSetConfiguration';
import { NodeSorter } from './NodeSorter';
import { CrawlerDTOMapper } from './CrawlerDTOMapper';

export class NodeAddressDTOComposer {
	/*
	 * Compose a list of node addresses to crawl. The list is sorted by inclusion in the network quorum set.
	 * BootstrapNodeAddresses are added to the end
	 */
	static compose(
		nodes: Node[],
		bootstrapNodeAddresses: NodeAddress[],
		networkQuorumSet: NetworkQuorumSetConfiguration
	): NodeAddressDTO[] {
		// crawl the top tier nodes first. If for some reason nodes are not sending the externalize messages of other nodes they depend on,
		// we can at least pick up the own messages of the top tier because the crawler will connect to them simultaneously and keep listening until timeout or a ledger close.
		// Edge case: most of the top tiers are overloaded and we cannot connect to them: without relay of externalize messages we also cannot find out if the nodes are validating.
		// Edge case: If the top tier nodes are validating but do not even send their own externalize messages to us, then there is no way we can determine their validating status.
		// For maximum robustness the max open connections setting is advised to be at least the number of top tier nodes.
		const sortedNodes = NodeSorter.sortByNetworkQuorumSetInclusion(
			nodes,
			networkQuorumSet
		);

		const sortedNodeAddressDTOs =
			CrawlerDTOMapper.mapNodeToNodeAddressDTOs(sortedNodes);

		const bootstrapNodeAddressDTOs =
			CrawlerDTOMapper.mapNodeAddressesToNodeAddressDTOs(
				bootstrapNodeAddresses
			);

		return sortedNodeAddressDTOs.concat(bootstrapNodeAddressDTOs);
	}
}
