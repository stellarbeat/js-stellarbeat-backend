import { createDummyNode } from '../../../__fixtures__/createDummyNode';
import { NodeSorter } from '../NodeSorter';
import { QuorumSet } from '../../../../network/QuorumSet';

describe('NodeSorter', () => {
	test('sortByNetworkQuorumSetInclusion', () => {
		const a = createDummyNode();
		const b = createDummyNode();
		const c = createDummyNode();
		const d = createDummyNode();

		const quorumSet = new QuorumSet(
			2,
			[a.publicKey],
			[new QuorumSet(1, [b.publicKey], [])]
		);

		const nodes = [c, d, b, a];
		NodeSorter.sortByNetworkQuorumSetInclusion(nodes, quorumSet);

		function assertAAndBInFront() {
			expect(
				[b.publicKey.value, a.publicKey.value].includes(
					nodes[0].publicKey.value
				)
			).toBeTruthy();
			expect(
				[b.publicKey.value, a.publicKey.value].includes(
					nodes[1].publicKey.value
				)
			).toBeTruthy();
		}

		assertAAndBInFront();
	});
});
