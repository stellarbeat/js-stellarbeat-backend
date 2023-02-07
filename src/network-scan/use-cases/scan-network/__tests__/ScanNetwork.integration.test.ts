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
import { NetworkRepository } from '../../../domain/network/NetworkRepository';
import { NetworkId } from '../../../domain/network/NetworkId';
import { ScanRepository } from '../../../domain/ScanRepository';
import { QuorumSet } from '@stellarbeat/js-stellarbeat-shared';
import { createDummyQuorumSet } from '../../../domain/network/__fixtures__/createDummyQuorumSet';

let kernel: Kernel;
jest.setTimeout(60000); //slow integration tests

describe('ScanNetwork.integration', () => {
	it(
		'should scan the network starting with the known peer nodes and continue with the known nodes ' +
			'and create correct network measurements',
		async () => {
			const config = new ConfigMock();
			const quorumSet = createDummyQuorumSet();
			config.networkConfig.quorumSet = quorumSet.validators.map(
				(validator) => validator.value
			);
			config.networkConfig.knownPeers = [['127.0.0.4', 3000]];
			config.networkConfig.stellarCoreVersion = '1.0.0';
			kernel = await Kernel.getInstance(config);
			const crawler = mock<Crawler>();
			const crawledPeerNode1 = new PeerNode(createDummyPublicKeyString());
			crawledPeerNode1.ip = '127.0.0.1';
			crawledPeerNode1.port = 3000;
			crawledPeerNode1.isValidating = true;
			const crawledPeerNode2 = new PeerNode(createDummyPublicKeyString());
			crawledPeerNode2.ip = '127.0.0.2';
			crawledPeerNode2.port = 3000;
			crawledPeerNode2.isValidating = true;
			const crawledPeerNode3 = new PeerNode(createDummyPublicKeyString());
			crawledPeerNode3.ip = '127.0.0.3';
			crawledPeerNode3.port = 3000;
			crawledPeerNode3.isValidating = true;

			crawledPeerNode1.quorumSetHash = 'hash1';
			crawledPeerNode1.quorumSet = new QuorumSet(2, [
				crawledPeerNode2.publicKey,
				crawledPeerNode1.publicKey,
				crawledPeerNode3.publicKey
			]);
			crawledPeerNode2.quorumSetHash = 'hash2';
			crawledPeerNode2.quorumSet = new QuorumSet(2, [
				crawledPeerNode1.publicKey,
				crawledPeerNode2.publicKey,
				crawledPeerNode3.publicKey
			]);
			crawledPeerNode3.quorumSetHash = 'hash3';
			crawledPeerNode3.quorumSet = new QuorumSet(2, [
				crawledPeerNode1.publicKey,
				crawledPeerNode2.publicKey,
				crawledPeerNode3.publicKey
			]);

			const ledger = {
				sequence: BigInt(1),
				closeTime: new Date()
			};
			crawler.crawl.mockResolvedValue({
				peers: new Map([
					[crawledPeerNode1.publicKey, crawledPeerNode1],
					[crawledPeerNode2.publicKey, crawledPeerNode2],
					[crawledPeerNode3.publicKey, crawledPeerNode3]
				]),
				latestClosedLedger: ledger,
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

			const scanResult = await kernel.container
				.get(ScanRepository)
				.findLatest();
			expect(scanResult.isOk()).toBe(true);
			if (scanResult.isErr()) {
				throw scanResult.error;
			}
			expect(scanResult.value).toBeDefined();
			if (!scanResult.value) throw new Error('scanResult.value is undefined');

			expect(scanResult.value.nodeScan.nodes).toHaveLength(3);
			expect(scanResult.value.networkScan.latestLedger).toEqual(BigInt(1));
			expect(
				scanResult.value.networkScan.measurement?.nrOfActiveWatchers
			).toEqual(0);
			expect(
				scanResult.value.networkScan.measurement?.nrOfActiveValidators
			).toEqual(3);
			expect(
				scanResult.value.networkScan.measurement?.transitiveQuorumSetSize
			).toEqual(3);
			expect(
				scanResult.value.networkScan.measurement?.hasQuorumIntersection
			).toEqual(true);
			expect(scanResult.value.networkScan.measurement?.topTierSize).toEqual(3);
			expect(
				scanResult.value.networkScan.measurement?.minBlockingSetSize
			).toEqual(2);
			expect(
				scanResult.value.networkScan.measurement?.minSplittingSetSize
			).toEqual(1);

			const network = await kernel.container
				.get<NetworkRepository>(NETWORK_TYPES.NetworkRepository)
				.findActiveByNetworkId(new NetworkId('test'));
			expect(network).toBeDefined();

			const newScanResult = await useCase.execute({
				updateNetwork: true,
				dryRun: false
			});
			expect(newScanResult.isOk()).toBe(true);
			expect(crawler.crawl).toHaveBeenLastCalledWith(
				[
					[crawledPeerNode3.ip, crawledPeerNode3.port],
					[crawledPeerNode2.ip, crawledPeerNode2.port],
					[crawledPeerNode1.ip, crawledPeerNode1.port],
					[
						config.networkConfig.knownPeers[0][0],
						config.networkConfig.knownPeers[0][1]
					]
				],
				new QuorumSet(2, [
					quorumSet.validators[0].value,
					quorumSet.validators[1].value
				]),
				ledger,
				new Map([
					[crawledPeerNode1.quorumSetHash, crawledPeerNode1.quorumSet],
					[crawledPeerNode2.quorumSetHash, crawledPeerNode2.quorumSet],
					[crawledPeerNode3.quorumSetHash, crawledPeerNode3.quorumSet]
				])
			);

			await TestUtils.resetDB(kernel.container.get(Connection));
			await kernel.close();
		}
	);
});
