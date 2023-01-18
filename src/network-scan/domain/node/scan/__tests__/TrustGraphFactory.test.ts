import NodeQuorumSet from '../../NodeQuorumSet';
import { QuorumSet } from '@stellarbeat/js-stellarbeat-shared';
import { TrustGraphFactory } from '../TrustGraphFactory';
import { NodeScanResult } from '../NodeScanResult';

it('should create TrustGraph', function () {
	const node1 = createNode('a');
	const node2 = createNode('b');
	const node3 = createNode('c');
	const node4 = createNode('d');

	node1.quorumSet = NodeQuorumSet.create(
		'a',
		new QuorumSet(2, ['b', 'c'], [new QuorumSet(1, ['d'], [])])
	);
	node2.quorumSet = NodeQuorumSet.create('b', new QuorumSet(1, ['a'], []));
	node3.quorumSet = NodeQuorumSet.create('c', new QuorumSet(1, ['a'], []));

	const trustGraph = TrustGraphFactory.create([node1, node2, node3, node4]);
	expect(Array.from(trustGraph.vertices)).toHaveLength(4);
	expect(Array.from(trustGraph.edges)).toHaveLength(5);
	expect(
		Array.from(trustGraph.edges).find(
			(e) => e.parent.key === 'a' && e.child.key === 'b'
		)
	).toBeDefined();
	expect(
		Array.from(trustGraph.edges).find(
			(e) => e.parent.key === 'a' && e.child.key === 'c'
		)
	).toBeDefined();
	expect(
		Array.from(trustGraph.edges).find(
			(e) => e.parent.key === 'a' && e.child.key === 'd'
		)
	).toBeDefined();
	expect(
		Array.from(trustGraph.edges).find(
			(e) => e.parent.key === 'b' && e.child.key === 'a'
		)
	).toBeDefined();
	expect(
		Array.from(trustGraph.edges).find(
			(e) => e.parent.key === 'c' && e.child.key === 'a'
		)
	).toBeDefined();
});

function createNode(publicKey: string): NodeScanResult {
	return {
		ip: 'localhost',
		port: 11625,
		publicKey: publicKey,
		quorumSet: null,
		quorumSetHash: '',
		geoData: null,
		ledgerVersion: 3,
		overlayVersion: 2,
		stellarCoreVersion: 'v1.0.0',
		overlayMinVersion: 1,
		isValidating: true,
		active: true,
		overLoaded: true,
		participatingInSCP: true,
		name: null,
		homeDomain: null,
		historyArchiveUpToDate: null,
		host: null,
		alias: null,
		historyArchiveUrl: null,
		historyArchiveHasError: null,
		index: null,
		isp: null
	};
}
