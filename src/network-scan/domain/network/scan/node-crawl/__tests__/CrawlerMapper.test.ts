import {
	createDummyPublicKey,
	createDummyPublicKeyString
} from '../../../../node/__fixtures__/createDummyPublicKey';
import { CrawlerMapper } from '../CrawlerMapper';
import { PeerNode } from '@stellarbeat/js-stellar-node-crawler';
import { QuorumSet as QuorumSetDTO } from '@stellarbeat/js-stellar-domain';
import { QuorumSet } from '../../../QuorumSet';
import { NodeScanResult } from '../../NetworkScanner';
import NodeQuorumSet from '../../../../node/NodeQuorumSet';

describe('CrawlerMapper', () => {
	it('should map to CrawlerQuorumSet', function () {
		const a = createDummyPublicKey();
		const b = createDummyPublicKey();
		const c = createDummyPublicKey();
		const quorumSet = new QuorumSet(2, [a, b], [new QuorumSet(1, [c], [])]);

		const crawlerQuorumSet = CrawlerMapper.toQuorumSetDTO(quorumSet);
		expect(crawlerQuorumSet.threshold).toEqual(2);
		expect(crawlerQuorumSet.validators).toEqual([a.value, b.value]);
		expect(crawlerQuorumSet.innerQuorumSets).toHaveLength(1);
		expect(crawlerQuorumSet.innerQuorumSets[0].threshold).toEqual(1);
		expect(crawlerQuorumSet.innerQuorumSets[0].validators).toEqual([c.value]);
	});

	it('should map to NodeResult', function () {
		const a = createDummyPublicKeyString();
		const b = createDummyPublicKeyString();
		const c = createDummyPublicKeyString();
		const quorumSet = new QuorumSetDTO(
			2,
			[a, b],
			[new QuorumSetDTO(1, [c], [])]
		);

		const peerNode = new PeerNode(a);
		peerNode.ip = 'localhost';
		peerNode.port = 11625;
		peerNode.quorumSetHash = 'key';
		peerNode.quorumSet = quorumSet;
		peerNode.isValidating = true;
		peerNode.isValidatingIncorrectValues = true;
		peerNode.overLoaded = true;
		peerNode.suppliedPeerList = true;
		peerNode.latestActiveSlotIndex = '1';
		peerNode.nodeInfo = {
			ledgerVersion: 3,
			overlayVersion: 2,
			versionString: 'v1.0.0',
			overlayMinVersion: 1
		};
		const nodeResult: NodeScanResult = {
			ip: 'localhost',
			port: 11625,
			publicKey: a,
			quorumSet: NodeQuorumSet.create('key', quorumSet),
			quorumSetHash: 'key',
			geoData: null,
			ledgerVersion: 3,
			overlayVersion: 2,
			stellarCoreVersion: 'v1.0.0',
			overlayMinVersion: 1,
			isValidating: true,
			active: true,
			overLoaded: true,
			participatingInSCP: true,
			name: null,
			homeDomain: null,
			historyArchiveUpToDate: null,
			host: null,
			alias: null,
			historyArchiveUrl: null,
			historyArchiveHasError: null
		};

		const mappedResult = CrawlerMapper.mapPeerNodeToNodeResult(peerNode);
		expect(mappedResult).toEqual(nodeResult);
	});
});
