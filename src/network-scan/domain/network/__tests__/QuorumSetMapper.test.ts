import { createDummyPublicKey } from '../../node/__fixtures__/createDummyPublicKey';
import { QuorumSet } from '../QuorumSet';
import { QuorumSetMapper } from '../QuorumSetMapper';

it('should map to Basic QuorumSet', function () {
	const a = createDummyPublicKey();
	const b = createDummyPublicKey();
	const c = createDummyPublicKey();
	const quorumSet = new QuorumSet(2, [a, b], [new QuorumSet(1, [c], [])]);

	const crawlerQuorumSet = QuorumSetMapper.toBaseQuorumSet(quorumSet);
	expect(crawlerQuorumSet.threshold).toEqual(2);
	expect(crawlerQuorumSet.validators).toEqual([a.value, b.value]);
	expect(crawlerQuorumSet.innerQuorumSets).toHaveLength(1);
	expect(crawlerQuorumSet.innerQuorumSets[0].threshold).toEqual(1);
	expect(crawlerQuorumSet.innerQuorumSets[0].validators).toEqual([c.value]);
});
