import { Node as NodeDTO } from '@stellarbeat/js-stellar-domain';
import NodeQuorumSet from '../NodeQuorumSet';

test('fromNode', () => {
	const node = new NodeDTO('A');
	const quorumSetStorage = NodeQuorumSet.fromQuorumSetDTO(
		'key',
		node.quorumSet
	);

	expect(quorumSetStorage).toBeFalsy();
	expect(quorumSetStorage).toBeNull();
});

test('fromValidator', () => {
	const node = new NodeDTO('A');
	node.quorumSet.validators.push('a');
	node.quorumSetHashKey = 'key';
	const quorumSetStorage = NodeQuorumSet.fromQuorumSetDTO(
		node.quorumSetHashKey,
		node.quorumSet
	);

	expect(quorumSetStorage).toBeDefined();
	if (!quorumSetStorage) return;
	expect(quorumSetStorage.hash).toEqual(node.quorumSetHashKey);
	expect(quorumSetStorage.quorumSet).toEqual(node.quorumSet);
});
