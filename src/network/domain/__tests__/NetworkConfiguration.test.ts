import { NetworkConfiguration } from '../NetworkConfiguration';
import { QuorumSet } from '../QuorumSet';
import { createDummyPublicKey } from '../__fixtures__/createDummyPublicKey';

test('equals', () => {
	const publicKey1 = createDummyPublicKey();
	const publicKey2 = createDummyPublicKey();

	const innerQuorumSet = new QuorumSet(1, [publicKey1, publicKey2], []);
	const quorumSet = new QuorumSet(
		2,
		[publicKey1, publicKey2],
		[innerQuorumSet]
	);
	const config = NetworkConfiguration.create(1, 2, 3, '4', quorumSet);
	const config2 = NetworkConfiguration.create(1, 2, 3, '4', quorumSet);
	expect(config.equals(config2)).toBe(true);

	const identicalQuorumSet = new QuorumSet(
		2,
		[publicKey1, publicKey2],
		[innerQuorumSet]
	);
	const config3 = NetworkConfiguration.create(1, 2, 3, '4', identicalQuorumSet);
	expect(config.equals(config3)).toBe(true);

	const quorumSetPublicKeyOrderSwitched = new QuorumSet(
		2,
		[publicKey2, publicKey1],
		[innerQuorumSet]
	);
	const config4 = NetworkConfiguration.create(
		1,
		2,
		3,
		'4',
		quorumSetPublicKeyOrderSwitched
	);
	expect(config.equals(config4)).toBe(false);

	const otherQuorumSet = new QuorumSet(
		3,
		[publicKey1, publicKey2],
		[innerQuorumSet]
	);
	const config5 = NetworkConfiguration.create(1, 2, 3, '4', otherQuorumSet);
	expect(config.equals(config5)).toBe(false);
});
