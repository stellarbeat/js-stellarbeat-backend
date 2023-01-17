import { QuorumSet } from '../../QuorumSet';
import { createDummyPublicKey } from '../../../node/__fixtures__/createDummyPublicKey';
import { CrawlerMapper } from '../node-crawl/CrawlerMapper';

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
