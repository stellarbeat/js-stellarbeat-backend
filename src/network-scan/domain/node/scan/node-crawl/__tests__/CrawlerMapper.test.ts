import {
	createDummyPublicKey,
	createDummyPublicKeyString
} from '../../../__fixtures__/createDummyPublicKey';
import { CrawlerMapper } from '../CrawlerMapper';
import { PeerNode } from '@stellarbeat/js-stellar-node-crawler';
import { QuorumSet as QuorumSetDTO } from '@stellarbeat/js-stellarbeat-shared';
import { QuorumSet } from '../../../../network/QuorumSet';
import NodeQuorumSet from '../../../NodeQuorumSet';
import { NodeScanMeasurement, NodeScanProps } from '../../NodeScanProps';
import { CrawlNode } from '../CrawlerService';

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
		const nodeScanProps: NodeScanProps = {
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
			name: null,
			homeDomain: null,
			host: null,
			alias: null,
			historyArchiveUrl: null,
			isp: null
		};

		const nodeMeasurement: NodeScanMeasurement = {
			isValidating: true,
			overLoaded: true,
			active: true,
			participatingInSCP: true,
			index: null,
			historyArchiveUpToDate: null,
			historyArchiveHasError: null,
			publicKey: a
		};

		const result = CrawlerMapper.mapPeerNodes(new Map([[a, peerNode]]));
		expect(result.nodeScanProps).toEqual([nodeScanProps]);
		expect(result.nodeScanMeasurements).toEqual([nodeMeasurement]);
	});

	it('should map to sorted NodeAddress', function () {
		const keyA = createDummyPublicKey();
		const a: CrawlNode = {
			address: ['localhost', 11625],
			quorumSet: null,
			publicKey: keyA,
			quorumSetHashKey: null
		};

		const keyB = createDummyPublicKey();
		const b: CrawlNode = {
			address: ['localhost', 11626],
			quorumSet: null,
			publicKey: keyB,
			quorumSetHashKey: null
		};

		const keyC = createDummyPublicKey();
		const c: CrawlNode = {
			address: ['localhost', 11627],
			quorumSet: null,
			publicKey: keyC,
			quorumSetHashKey: null
		};

		const keyD = createDummyPublicKey();
		const d: CrawlNode = {
			address: ['localhost', 11628],
			quorumSet: null,
			publicKey: keyD,
			quorumSetHashKey: null
		};

		const quorumSetDto = new QuorumSetDTO(2, [keyA.value, keyB.value]);

		const addresses =
			CrawlerMapper.mapToNodeAddressesSortedByNetworkQuorumSetInclusion(
				[c, b, d, a],
				quorumSetDto
			);

		expect([b.address, a.address].includes(addresses[0])).toBeTruthy();
		expect([b.address, a.address].includes(addresses[1])).toBeTruthy();
	});
});
