import { QuorumSet as QuorumSetDTO } from '@stellarbeat/js-stellarbeat-shared';
import { CrawlerService } from '../CrawlerService';
import { Crawler, PeerNode } from '@stellarbeat/js-stellar-node-crawler';
import { LoggerMock } from '../../../../../../core/services/__mocks__/LoggerMock';
import { mock } from 'jest-mock-extended';
import { QuorumSet } from '../../../../network/QuorumSet';
import {
	createDummyPublicKey,
	createDummyPublicKeyString
} from '../../../__fixtures__/createDummyPublicKey';
import { CrawlResult } from '@stellarbeat/js-stellar-node-crawler/lib/crawler';

describe('CrawlerService', function () {
	it('should crawl', async function () {
		const crawler = mock<Crawler>();
		const crawlResultPublicKey = createDummyPublicKeyString();
		const crawlResultCloseTime = new Date('2020-01-01');
		const crawlResultPeerNode = new PeerNode(crawlResultPublicKey);
		crawlResultPeerNode.ip = 'localhost';
		const crawlResultMock: CrawlResult = {
			peers: new Map([[crawlResultPublicKey, crawlResultPeerNode]]),
			closedLedgers: [BigInt(1)],
			latestClosedLedger: {
				sequence: BigInt(1),
				closeTime: crawlResultCloseTime
			}
		};
		crawler.crawl.mockResolvedValue(crawlResultMock);
		const crawlerService = new CrawlerService(crawler, new LoggerMock());

		const previousCloseTime = new Date();
		const result = await crawlerService.crawl(
			new QuorumSet(1, [createDummyPublicKey()], []),
			[
				{
					publicKey: createDummyPublicKey(),
					address: ['localhost', 100],
					quorumSetHashKey: 'key',
					quorumSet: new QuorumSetDTO(1, [createDummyPublicKeyString()], [])
				}
			],
			'1',
			previousCloseTime
		);

		expect(result.isOk()).toBeTruthy();
		if (!result.isOk()) throw result.error;
		expect(result.value.peerNodes.size).toEqual(1);
		expect(result.value.peerNodes.get(crawlResultPublicKey)).toBeInstanceOf(
			PeerNode
		);
		expect(result.value.latestClosedLedger).toEqual({
			sequence: BigInt(1),
			closeTime: crawlResultCloseTime
		});
	});
});
