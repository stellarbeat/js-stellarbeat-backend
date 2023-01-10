import { QuorumSet } from '../../QuorumSet';
import { createDummyPublicKey } from '../../__fixtures__/createDummyPublicKey';

export function createDummyQuorumSet() {
	const publicKey1 = createDummyPublicKey();
	const publicKey2 = createDummyPublicKey();

	const innerQuorumSet = new QuorumSet(1, [publicKey1, publicKey2], []);
	return new QuorumSet(2, [publicKey1, publicKey2], [innerQuorumSet]);
}
