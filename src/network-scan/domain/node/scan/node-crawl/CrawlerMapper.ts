import { QuorumSet } from '../../../network/QuorumSet';
import { QuorumSet as CrawlerQuorumSet } from '@stellarbeat/js-stellarbeat-shared';
import { PeerNode } from '@stellarbeat/js-stellar-node-crawler';
import NodeQuorumSet from '../../NodeQuorumSet';
import { NodeScanMeasurement, NodeScanProps } from '../NodeScanProps';
import { QuorumSet as QuorumSetDTO } from '@stellarbeat/js-stellarbeat-shared/lib/quorum-set';
import { NodeAddress } from '@stellarbeat/js-stellar-node-crawler/lib/crawler';
import { CrawlNode } from './CrawlerService';

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

	static mapPeerNodes(peerNodes: Map<string, PeerNode>): {
		nodeScanProps: NodeScanProps[];
		nodeScanMeasurements: NodeScanMeasurement[];
	} {
		return {
			nodeScanProps: Array.from(peerNodes.values()).map((peer) =>
				CrawlerMapper.mapPeerNodeToNodeScanProps(peer)
			),
			nodeScanMeasurements: Array.from(peerNodes.values()).map((peer) =>
				CrawlerMapper.mapPeerNodeToNodeScanMeasurement(peer)
			)
		};
	}

	static mapPeerNodeToNodeScanMeasurement(
		peerNode: PeerNode
	): NodeScanMeasurement {
		return {
			publicKey: peerNode.publicKey,
			active: true,
			isValidating: peerNode.isValidating,
			overLoaded: peerNode.overLoaded,
			participatingInSCP: peerNode.participatingInSCP,
			historyArchiveUpToDate: null,
			historyArchiveHasError: null,
			index: null
		};
	}

	static mapPeerNodeToNodeScanProps(peerNode: PeerNode): NodeScanProps {
		return {
			ip: peerNode.ip ? peerNode.ip : null,
			port: peerNode.port ? peerNode.port : null,
			publicKey: peerNode.publicKey,
			quorumSet:
				peerNode.quorumSetHash && peerNode.quorumSet
					? NodeQuorumSet.create(peerNode.quorumSetHash, peerNode.quorumSet)
					: null,
			geoData: null,
			ledgerVersion: peerNode.nodeInfo ? peerNode.nodeInfo.ledgerVersion : null,
			overlayVersion: peerNode.nodeInfo
				? peerNode.nodeInfo.overlayVersion
				: null,
			stellarCoreVersion: peerNode.nodeInfo
				? peerNode.nodeInfo.versionString
				: null,
			overlayMinVersion: peerNode.nodeInfo
				? peerNode.nodeInfo.overlayMinVersion
				: null,
			homeDomain: null,
			quorumSetHash: peerNode.quorumSetHash ? peerNode.quorumSetHash : null,
			name: null,
			historyArchiveUrl: null,
			alias: null,
			host: null,

			isp: null
		};
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
}
