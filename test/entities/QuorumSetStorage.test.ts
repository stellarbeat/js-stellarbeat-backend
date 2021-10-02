import { Node } from '@stellarbeat/js-stellar-domain';
import NodeQuorumSetStorage from '../../src/entities/NodeQuorumSetStorage';

test('fromNode', () => {
	const node = new Node('A');
	const quorumSetStorage = NodeQuorumSetStorage.fromQuorumSet(
		'key',
		node.quorumSet
	);

	expect(quorumSetStorage).toBeFalsy();
	expect(quorumSetStorage).toBeNull();
});

test('fromValidator', () => {
	const node = new Node('A');
	node.quorumSet.validators.push('a');
	node.quorumSetHashKey = 'key';
	const quorumSetStorage = NodeQuorumSetStorage.fromQuorumSet(
		node.quorumSetHashKey,
		node.quorumSet
	);

	expect(quorumSetStorage).toBeDefined();
	if (!quorumSetStorage) return;
	expect(quorumSetStorage.hash).toEqual(node.quorumSetHashKey);
	expect(quorumSetStorage.quorumSet).toEqual(node.quorumSet);
});
