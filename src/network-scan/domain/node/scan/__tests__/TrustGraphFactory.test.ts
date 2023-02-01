import NodeQuorumSet from '../../NodeQuorumSet';
import { QuorumSet } from '@stellarbeat/js-stellarbeat-shared';
import { TrustGraphFactory } from '../TrustGraphFactory';
import { createDummyNode } from '../../__fixtures__/createDummyNode';

it('should create TrustGraph', function () {
	const node1 = createDummyNode();
	const node2 = createDummyNode();
	const node3 = createDummyNode();
	const node4 = createDummyNode();

	node1.updateQuorumSet(
		NodeQuorumSet.create(
			node1.publicKey.value,
			new QuorumSet(2, [node2.publicKey.value, node3.publicKey.value], [])
		),
		node1.snapshotStartDate
	);
	node2.updateQuorumSet(
		NodeQuorumSet.create(
			node2.publicKey.value,
			new QuorumSet(1, [node1.publicKey.value], [])
		),
		node2.snapshotStartDate
	);
	node3.updateQuorumSet(
		NodeQuorumSet.create(
			node3.publicKey.value,
			new QuorumSet(1, [node1.publicKey.value], [])
		),
		node3.snapshotStartDate
	);

	const trustGraph = TrustGraphFactory.create([node1, node2, node3, node4]);
	expect(Array.from(trustGraph.vertices)).toHaveLength(4);
	expect(Array.from(trustGraph.edges)).toHaveLength(4);
	expect(
		Array.from(trustGraph.edges).find(
			(e) =>
				e.parent.key === node1.publicKey.value &&
				e.child.key === node2.publicKey.value
		)
	).toBeDefined();
	expect(
		Array.from(trustGraph.edges).find(
			(e) =>
				e.parent.key === node1.publicKey.value &&
				e.child.key === node3.publicKey.value
		)
	).toBeDefined();
	expect(
		Array.from(trustGraph.edges).find(
			(e) =>
				e.parent.key === node2.publicKey.value &&
				e.child.key === node1.publicKey.value
		)
	).toBeDefined();
	expect(
		Array.from(trustGraph.edges).find(
			(e) =>
				e.parent.key === node3.publicKey.value &&
				e.child.key === node1.publicKey.value
		)
	).toBeDefined();
	expect(trustGraph.stronglyConnectedComponents).toHaveLength(2);
	expect(trustGraph.hasNetworkTransitiveQuorumSet()).toBeTruthy();
	expect(trustGraph.networkTransitiveQuorumSet.size).toEqual(3);
});
