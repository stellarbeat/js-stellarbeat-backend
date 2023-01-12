import { Node } from '@stellarbeat/js-stellar-domain';
import NodeDetails from '../NodeDetails';

test('fromGhostNode', () => {
	const node = new Node('A', 'localhost', 1);
	expect(NodeDetails.fromNode(node)).toBeNull();
	expect(NodeDetails.fromNode(node)).toBeFalsy();
});

test('fromNode', () => {
	const node = new Node('A', 'localhost', 1);
	node.ledgerVersion = 1;
	node.overlayMinVersion = 2;
	node.overlayVersion = 3;
	node.versionStr = '4';
	const nodeDetails = NodeDetails.fromNode(node);

	expect(nodeDetails).toBeDefined();
	if (!nodeDetails) return;
	expect(nodeDetails.ledgerVersion).toEqual(1);
	expect(nodeDetails.overlayMinVersion).toEqual(2);
	expect(nodeDetails.overlayVersion).toEqual(3);
	expect(nodeDetails.versionStr).toEqual('4');
});
