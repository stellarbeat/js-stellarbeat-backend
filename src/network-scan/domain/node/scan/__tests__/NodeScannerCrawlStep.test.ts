import { NodeScannerCrawlStep } from '../NodeScannerCrawlStep';
import { CrawlerService } from '../node-crawl/CrawlerService';
import { mock } from 'jest-mock-extended';
import { NodeRepository } from '../../NodeRepository';
import { Logger } from '../../../../../core/services/PinoLogger';
import { NodeScan } from '../NodeScan';
import { createDummyNode } from '../../__fixtures__/createDummyNode';
import { NetworkQuorumSetConfiguration } from '../../../network/NetworkQuorumSetConfiguration';
import { err, ok } from 'neverthrow';
import { PeerNode } from '@stellarbeat/js-stellar-node-crawler';
import { createDummyPublicKey } from '../../__fixtures__/createDummyPublicKey';
import Node from '../../Node';

describe('NodeScannerCrawlStep', () => {
	const nodeRepository = mock<NodeRepository>();
	const crawlerService = mock<CrawlerService>();

	const time = new Date();
	const activeNode = createDummyNode();
	const newlyFoundPublicKey = createDummyPublicKey();
	crawlerService.crawl.mockResolvedValue(
		ok({
			latestClosedLedger: {
				sequence: BigInt(1),
				closeTime: new Date(),
				value: 'value',
				localCloseTime: new Date()
			},
			peerNodes: new Map([
				[activeNode.publicKey.value, new PeerNode(activeNode.publicKey.value)],
				[newlyFoundPublicKey.value, new PeerNode(newlyFoundPublicKey.value)]
			]),
			processedLedgers: [1]
		})
	);

	const nodeScan = new NodeScan(time, [activeNode]);

	const crawlStep = new NodeScannerCrawlStep(
		nodeRepository,
		crawlerService,
		mock<Logger>()
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should execute a crawl', async function () {
		nodeRepository.findByPublicKey.mockResolvedValue([]);
		const result = await crawlStep.execute(
			nodeScan,
			mock<NetworkQuorumSetConfiguration>()
		);
		expect(result.isOk()).toBe(true);
	});

	it('should check if a newly found node is archived', async function () {
		nodeRepository.findByPublicKey.mockResolvedValue([
			Node.create(new Date(), newlyFoundPublicKey, {
				ip: 'localhost',
				port: 11625
			})
		]);
		const result = await crawlStep.execute(
			nodeScan,
			mock<NetworkQuorumSetConfiguration>()
		);
		expect(nodeRepository.findByPublicKey).toBeCalledWith([
			newlyFoundPublicKey
		]);
		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;
		expect(nodeScan.nodes).toHaveLength(2);
	});

	it('should not call node repository if no new nodes are found', async function () {
		crawlerService.crawl.mockResolvedValue(
			ok({
				latestClosedLedger: {
					sequence: BigInt(1),
					closeTime: new Date(),
					value: 'value',
					localCloseTime: new Date()
				},
				peerNodes: new Map([
					[activeNode.publicKey.value, new PeerNode(activeNode.publicKey.value)]
				]),
				processedLedgers: [1]
			})
		);
		await crawlStep.execute(nodeScan, mock<NetworkQuorumSetConfiguration>());
		expect(nodeRepository.findByPublicKey).not.toBeCalled();
	});

	it('should ignore invalid public-keys', async function () {
		crawlerService.crawl.mockResolvedValue(
			ok({
				latestClosedLedger: {
					sequence: BigInt(1),
					closeTime: new Date(),
					value: 'value',
					localCloseTime: new Date()
				},
				peerNodes: new Map([['malformed', new PeerNode('malformed')]]),
				processedLedgers: [1]
			})
		);
		const result = await crawlStep.execute(
			nodeScan,
			mock<NetworkQuorumSetConfiguration>()
		);
		expect(result.isOk()).toBe(true);
		expect(nodeRepository.findByPublicKey).not.toBeCalled();
	});

	it('should return error if crawl fails', async function () {
		crawlerService.crawl.mockResolvedValue(err(new Error('test')));
		const result = await crawlStep.execute(
			nodeScan,
			mock<NetworkQuorumSetConfiguration>()
		);
		expect(result.isErr()).toBe(true);
	});

	it('should return error if fetching archived nodes fails', async function () {
		nodeRepository.findByPublicKey.mockRejectedValue(new Error('test'));
		const result = await crawlStep.execute(
			nodeScan,
			mock<NetworkQuorumSetConfiguration>()
		);
		expect(result.isErr()).toBe(true);
	});
});
