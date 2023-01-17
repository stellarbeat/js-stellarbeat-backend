import { QuorumSet } from '../../QuorumSet';
import { QuorumSet as CrawlerQuorumSet } from '@stellarbeat/js-stellar-domain';
import { PeerNode } from '@stellarbeat/js-stellar-node-crawler';
import { NodeScanResult } from '../NetworkScanner';
import NodeQuorumSet from '../../../node/NodeQuorumSet';

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

	static mapPeerNodeToNodeResult(peerNode: PeerNode): NodeScanResult {
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
			active: true,
			quorumSetHash: peerNode.quorumSetHash ? peerNode.quorumSetHash : null,
			name: null,
			isValidating: peerNode.isValidating,
			overLoaded: peerNode.overLoaded,
			participatingInSCP: peerNode.participatingInSCP,
			historyArchiveUpToDate: null,
			historyArchiveUrl: null,
			alias: null,
			host: null,
			historyArchiveHasError: null,
			index: null,
			isp: null
		};
	}
}
