import { QuorumSet } from '../QuorumSet';
import { createDummyPublicKey } from '../../node/__fixtures__/createDummyPublicKey';
import { TransitiveQuorumSetFinder } from '../TransitiveQuorumSetFinder';

describe('TransitiveQuorumSetFinder', () => {
	it('should find the transitive quorum set by traversing the validators array', () => {
		const quorumSetMap = new Map<string, QuorumSet>();
		const publicKey1 = createDummyPublicKey();
		const publicKey2 = createDummyPublicKey();
		const publicKey3 = createDummyPublicKey();
		const publicKey4 = createDummyPublicKey();
		const publicKey5 = createDummyPublicKey();

		const startingQuorumSet = new QuorumSet(1, [publicKey2, publicKey3], []);
		quorumSetMap.set(publicKey1.value, startingQuorumSet);
		quorumSetMap.set(publicKey2.value, new QuorumSet(1, [publicKey4], []));
		quorumSetMap.set(
			publicKey3.value,
			new QuorumSet(1, [publicKey5, publicKey1], [])
		);
		quorumSetMap.set(publicKey4.value, new QuorumSet(1, [publicKey1], []));
		const transitiveQuorumSet = TransitiveQuorumSetFinder.find(
			startingQuorumSet,
			quorumSetMap
		);
		assertContains(transitiveQuorumSet, [
			publicKey1.value,
			publicKey2.value,
			publicKey3.value,
			publicKey4.value,
			publicKey5.value
		]);
	});

	it('should find the transitive quorum set by traversing inner quorum sets', function () {
		const quorumSetMap = new Map<string, QuorumSet>();
		const publicKey1 = createDummyPublicKey();
		const publicKey2 = createDummyPublicKey();
		const publicKey3 = createDummyPublicKey();
		const publicKey4 = createDummyPublicKey();
		const publicKey5 = createDummyPublicKey();
		const quorumSet1 = new QuorumSet(
			1,
			[],
			[
				new QuorumSet(1, [publicKey2], []),
				new QuorumSet(1, [publicKey2], [new QuorumSet(1, [publicKey3], [])])
			]
		);
		const quorumSet2 = new QuorumSet(
			1,
			[],
			[new QuorumSet(1, [publicKey4], [])]
		);
		const quorumSet3 = new QuorumSet(
			1,
			[],
			[new QuorumSet(1, [publicKey5], [])]
		);
		const quorumSet4 = new QuorumSet(
			1,
			[],
			[new QuorumSet(1, [publicKey1], [])]
		);
		quorumSetMap.set(publicKey1.value, quorumSet1);
		quorumSetMap.set(publicKey2.value, quorumSet2);
		quorumSetMap.set(publicKey3.value, quorumSet3);
		quorumSetMap.set(publicKey4.value, quorumSet4);
		const transitiveQuorumSet = TransitiveQuorumSetFinder.find(
			quorumSet1,
			quorumSetMap
		);
		assertContains(transitiveQuorumSet, [
			publicKey1.value,
			publicKey2.value,
			publicKey3.value,
			publicKey4.value,
			publicKey5.value
		]);
	});

	function assertContains(
		transitiveQuorumSet: Set<string>,
		publicKeys: string[]
	) {
		expect(transitiveQuorumSet.size).toBe(publicKeys.length);
		publicKeys.forEach((publicKey) => {
			expect(transitiveQuorumSet.has(publicKey)).toBe(true);
		});
	}
});
