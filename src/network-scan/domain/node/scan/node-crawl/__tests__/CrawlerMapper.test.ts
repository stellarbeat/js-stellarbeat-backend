import { createDummyPublicKey } from '../../../__fixtures__/createDummyPublicKey';
import { CrawlerMapper } from '../CrawlerMapper';
import { QuorumSet as QuorumSetDTO } from '@stellarbeat/js-stellarbeat-shared';
import { QuorumSet } from '../../../../network/QuorumSet';
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
