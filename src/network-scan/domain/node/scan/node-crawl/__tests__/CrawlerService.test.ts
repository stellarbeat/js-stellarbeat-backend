import { CrawlerService } from '../CrawlerService';
import { Crawler, PeerNode } from '@stellarbeat/js-stellar-node-crawler';
import { mock } from 'jest-mock-extended';
import { NetworkQuorumSetConfiguration } from '../../../../network/NetworkQuorumSetConfiguration';
import {
	createDummyPublicKey,
	createDummyPublicKeyString
} from '../../../__fixtures__/createDummyPublicKey';
import { CrawlResult } from '@stellarbeat/js-stellar-node-crawler/lib/crawler';
import { createDummyNode } from '../../../__fixtures__/createDummyNode';
import { createDummyNodeAddress } from '../../../__fixtures__/createDummyNodeAddress';

describe('CrawlerService', function () {
	it('should crawl', async function () {
		const crawler = mock<Crawler>();
		const crawlResult = createCrawlResult();
		crawler.crawl.mockResolvedValue(crawlResult);

		const crawlerService = new CrawlerService(crawler);

		const result = await crawlerService.crawl(
			createDummyNetworkQuorumSet(),
			[createDummyNode()],
			[createDummyNodeAddress()],
			BigInt(1),
			new Date()
		);

		expect(result.isOk()).toBeTruthy();
		if (!result.isOk()) throw result.error;
		expect(result.value.peerNodes).toEqual(crawlResult.peers);
		expect(result.value.processedLedgers[0]).toEqual(
			Number(crawlResult.closedLedgers[0])
		);
		expect(result.value.latestClosedLedger).toEqual(
			crawlResult.latestClosedLedger
		);
	});

	it('should return error if no nodes and no bootstrap node addresses are passed', async function () {
		const crawler = mock<Crawler>();
		const crawlerService = new CrawlerService(crawler);

		const result = await crawlerService.crawl(
			createDummyNetworkQuorumSet(),
			[],
			[],
			BigInt(1),
			new Date()
		);

		expect(result.isErr()).toBeTruthy();
		if (!result.isErr()) throw new Error('Expected error but got ok');
		expect(result.error).toBeInstanceOf(Error);
	});

	it('should return error if crawler throws Error', async function () {
		const crawler = mock<Crawler>();
		crawler.crawl.mockRejectedValue(new Error('test error'));

		const crawlerService = new CrawlerService(crawler);

		const result = await crawlerService.crawl(
			createDummyNetworkQuorumSet(),
			[createDummyNode()],
			[createDummyNodeAddress()],
			BigInt(1),
			new Date()
		);

		expect(result.isErr()).toBeTruthy();
		if (!result.isErr()) throw new Error('Expected error but got ok');
		expect(result.error).toBeInstanceOf(Error);
	});

	it('should return error if crawl result did not connect successfully to a single peer', async function () {
		const crawler = mock<Crawler>();
		const crawlResult = createCrawlResult();
		crawlResult.peers.clear();
		crawler.crawl.mockResolvedValue(crawlResult);

		const crawlerService = new CrawlerService(crawler);

		const result = await crawlerService.crawl(
			createDummyNetworkQuorumSet(),
			[createDummyNode()],
			[createDummyNodeAddress()],
			BigInt(1),
			new Date()
		);

		expect(result.isErr()).toBeTruthy();
		if (!result.isErr()) throw new Error('Expected error but got ok');
		expect(result.error).toBeInstanceOf(Error);
	});

	function createDummyNetworkQuorumSet(): NetworkQuorumSetConfiguration {
		return new NetworkQuorumSetConfiguration(1, [createDummyPublicKey()], []);
	}

	function createCrawlResult(): CrawlResult {
		const crawlResultPublicKey = createDummyPublicKeyString();
		const crawlResultCloseTime = new Date('2020-01-01');
		const crawlResultPeerNode = new PeerNode(crawlResultPublicKey);
		crawlResultPeerNode.ip = 'localhost';
		return {
			peers: new Map([[crawlResultPublicKey, crawlResultPeerNode]]),
			closedLedgers: [BigInt(1)],
			latestClosedLedger: {
				sequence: BigInt(1),
				closeTime: crawlResultCloseTime
			}
		};
	}
});
