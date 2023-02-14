import { createDummyPublicKey } from '../../node/__fixtures__/createDummyPublicKey';
import { NetworkQuorumSetConfiguration } from '../NetworkQuorumSetConfiguration';
import { NetworkQuorumSetConfigurationMapper } from '../NetworkQuorumSetConfigurationMapper';

it('should map to Basic QuorumSet', function () {
	const a = createDummyPublicKey();
	const b = createDummyPublicKey();
	const c = createDummyPublicKey();
	const quorumSet = new NetworkQuorumSetConfiguration(
		2,
		[a, b],
		[new NetworkQuorumSetConfiguration(1, [c], [])]
	);

	const crawlerQuorumSet =
		NetworkQuorumSetConfigurationMapper.toBaseQuorumSet(quorumSet);
	expect(crawlerQuorumSet.threshold).toEqual(2);
	expect(crawlerQuorumSet.validators).toEqual([a.value, b.value]);
	expect(crawlerQuorumSet.innerQuorumSets).toHaveLength(1);
	expect(crawlerQuorumSet.innerQuorumSets[0].threshold).toEqual(1);
	expect(crawlerQuorumSet.innerQuorumSets[0].validators).toEqual([c.value]);
});
