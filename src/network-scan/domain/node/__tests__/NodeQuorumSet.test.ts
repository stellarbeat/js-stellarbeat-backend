import NodeQuorumSet from '../NodeQuorumSet';
import { QuorumSet } from '@stellarbeat/js-stellarbeat-shared';

describe('NodeQuorumSet', () => {
	it('should equal another NodeQuorumSet when the hashkey is the same', function () {
		const quorumSet = NodeQuorumSet.create(
			'hashkey',
			new QuorumSet(1, ['a', 'b'], [])
		);
		const otherQuorumSet = NodeQuorumSet.create(
			'hashkey',
			new QuorumSet(1, ['a', 'b'], [])
		);
		expect(quorumSet.equals(otherQuorumSet)).toBe(true);
	});
	it('should not equal when the hashkeys are different', function () {
		const quorumSet = NodeQuorumSet.create(
			'hashkey',
			new QuorumSet(1, ['a', 'b'], [])
		);
		const otherQuorumSet = NodeQuorumSet.create(
			'hashkey2',
			new QuorumSet(1, ['a', 'b'], [])
		);
		expect(quorumSet.equals(otherQuorumSet)).toBe(false);
	});
});
