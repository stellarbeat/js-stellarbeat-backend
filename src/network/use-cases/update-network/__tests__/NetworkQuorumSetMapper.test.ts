import { createDummyPublicKey } from '../../../domain/__fixtures__/createDummyPublicKey';
import { NetworkQuorumSetMapper } from '../NetworkQuorumSetMapper';
import { QuorumSet } from '../../../domain/QuorumSet';

test('fromArray', () => {
	const a = createDummyPublicKey();
	const b = createDummyPublicKey();
	const c1 = createDummyPublicKey();
	const c2 = createDummyPublicKey();
	const c3 = createDummyPublicKey();
	const d1 = createDummyPublicKey();
	const d2 = createDummyPublicKey();
	const d3 = createDummyPublicKey();
	const d4 = createDummyPublicKey();
	const d5 = createDummyPublicKey();

	const quorumSetFromConfigOrError = NetworkQuorumSetMapper.fromArray([
		a.value,
		b.value,
		[c1.value, c2.value, c3.value],
		[d1.value, d2.value, d3.value, d4.value, d5.value]
	]);

	const quorumSet = new QuorumSet(
		3,
		[a, b],
		[
			new QuorumSet(2, [c1, c2, c3], []),
			new QuorumSet(3, [d1, d2, d3, d4, d5], [])
		]
	);

	expect(quorumSetFromConfigOrError.isOk()).toBe(true);
	if (!quorumSetFromConfigOrError.isOk())
		throw quorumSetFromConfigOrError.error;

	console.log(quorumSetFromConfigOrError.value);
	console.log(quorumSet);
	expect(quorumSetFromConfigOrError.value.equals(quorumSet)).toBeTruthy();
});
