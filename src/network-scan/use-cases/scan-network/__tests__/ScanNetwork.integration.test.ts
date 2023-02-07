import Kernel from '../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { ScanNetwork } from '../ScanNetwork';
import { TestUtils } from '../../../../core/utilities/TestUtils';
import { Connection } from 'typeorm';
import { createDummyPublicKeyString } from '../../../domain/node/__fixtures__/createDummyPublicKey';
import { Crawler, PeerNode } from '@stellarbeat/js-stellar-node-crawler';
import { mock } from 'jest-mock-extended';
import { CrawlerService } from '../../../domain/node/scan/node-crawl/CrawlerService';
import { NETWORK_TYPES } from '../../../infrastructure/di/di-types';
import { NodeRepository } from '../../../domain/node/NodeRepository';
import { NetworkRepository } from '../../../domain/network/NetworkRepository';
import { NetworkId } from '../../../domain/network/NetworkId';
import { ScanRepository } from '../../../domain/ScanRepository';

let kernel: Kernel;
jest.setTimeout(60000); //slow integration tests

describe('ScanNetwork.integration', () => {
	it('should scan the network starting with the known peer nodes (initial scan)', async () => {
		const config = new ConfigMock();
		config.networkConfig.quorumSet = [createDummyPublicKeyString()];
		config.networkConfig.knownPeers = [['127.0.0.1', 3000]];
		config.networkConfig.stellarCoreVersion = '1.0.0';
		kernel = await Kernel.getInstance(config);
		const crawler = mock<Crawler>();
		const crawledPeerNode = new PeerNode(createDummyPublicKeyString());
		crawledPeerNode.ip = '127.0.0.1';
		crawledPeerNode.port = 3000;

		crawler.crawl.mockResolvedValue({
			peers: new Map([[crawledPeerNode.publicKey, crawledPeerNode]]),
			latestClosedLedger: {
				sequence: BigInt(1),
				closeTime: new Date()
			},
			closedLedgers: [BigInt(1)]
		});
		const crawlerService = new CrawlerService(crawler);
		kernel.container.rebind(CrawlerService).toConstantValue(crawlerService);

		const useCase = kernel.container.get(ScanNetwork);

		const result = await useCase.execute({
			updateNetwork: true,
			dryRun: false
		});

		expect(result.isOk()).toBe(true);
		const activeNodes = await kernel.container
			.get<NodeRepository>(NETWORK_TYPES.NodeRepository)
			.findLatestActive();
		expect(activeNodes.length).toBe(1);

		const scanResult = await kernel.container.get(ScanRepository).findLatest();
		expect(scanResult.isOk()).toBe(true);
		if (scanResult.isErr()) {
			throw scanResult.error;
		}
		expect(scanResult.value).toBeDefined();
		if (!scanResult.value) throw new Error('scanResult.value is undefined');

		expect(scanResult.value.nodeScan.nodes).toHaveLength(1);
		expect(scanResult.value.networkScan.latestLedger).toEqual(BigInt(1));
		expect(
			scanResult.value.networkScan.measurement?.nrOfActiveWatchers
		).toEqual(1);

		const network = await kernel.container
			.get<NetworkRepository>(NETWORK_TYPES.NetworkRepository)
			.findActiveByNetworkId(new NetworkId('test'));
		expect(network).toBeDefined();

		await TestUtils.resetDB(kernel.container.get(Connection));
		await kernel.close();
	});
});
