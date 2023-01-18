import { Node, QuorumSet } from '@stellarbeat/js-stellarbeat-shared';
import { CrawlerService } from '../CrawlerService';
import { Crawler, PeerNode } from '@stellarbeat/js-stellar-node-crawler';
import { LoggerMock } from '../../../../../../core/services/__mocks__/LoggerMock';

it('should map peer nodes to nodes', function () {
	const crawlerService = new CrawlerService({} as Crawler, new LoggerMock());

	const node = new Node('A', 'localhost', 100);
	node.quorumSetHashKey = 'key';
	node.quorumSet = new QuorumSet();
	const missingNode = new Node('B');
	missingNode.isValidating = true;

	const notSuccessfullyConnectedNode = new Node('D');
	notSuccessfullyConnectedNode.ip = 'known';
	notSuccessfullyConnectedNode.port = 100;
	notSuccessfullyConnectedNode.active = false;
	notSuccessfullyConnectedNode.isValidating = false;
	notSuccessfullyConnectedNode.overLoaded = true;

	const peerNodeA = new PeerNode('A');
	peerNodeA.ip = 'localhost2';
	peerNodeA.port = 100;
	peerNodeA.isValidating = true;
	peerNodeA.latestActiveSlotIndex = '12';
	peerNodeA.overLoaded = true;
	peerNodeA.quorumSetHash = 'newKey';
	peerNodeA.quorumSet = new QuorumSet(1, ['F']);
	peerNodeA.nodeInfo = {
		versionString: 'v1',
		overlayVersion: 1,
		overlayMinVersion: 2,
		ledgerVersion: 3
	};

	const newPeerNode = new PeerNode('C');

	const notSuccessfullyConnectedPeerNode = new PeerNode('D');
	notSuccessfullyConnectedPeerNode.isValidating = true;
	notSuccessfullyConnectedPeerNode.overLoaded = false;

	newPeerNode.ip = 'localhost';
	newPeerNode.port = 101;

	const peerNodes = new Map<string, PeerNode>();
	peerNodes.set(peerNodeA.publicKey, peerNodeA);
	peerNodes.set(newPeerNode.publicKey, newPeerNode);
	peerNodes.set(
		notSuccessfullyConnectedPeerNode.publicKey,
		notSuccessfullyConnectedPeerNode
	);

	const { nodes, nodesWithNewIP } = crawlerService.mapPeerNodesToNodes(
		peerNodes,
		[node, missingNode, notSuccessfullyConnectedNode]
	);

	expect(nodes).toHaveLength(4);
	expect(nodesWithNewIP).toHaveLength(2);

	const nodeACopy = nodes.find((node) => node.publicKey === 'A');
	expect(nodeACopy).toBeDefined();
	if (!nodeACopy) return;

	expect(nodeACopy.ip).toEqual('localhost2');
	expect(nodeACopy.isValidating).toBeTruthy();
	expect(nodeACopy.active).toBeTruthy();
	expect(nodeACopy.overLoaded).toBeTruthy();
	expect(nodeACopy.versionStr).toEqual('v1');
	expect(nodeACopy.overlayVersion).toEqual(1);
	expect(nodeACopy.overlayMinVersion).toEqual(2);
	expect(nodeACopy.ledgerVersion).toEqual(3);
	expect(nodeACopy.quorumSetHashKey).toEqual(peerNodeA.quorumSetHash);
	expect(nodeACopy.quorumSet.threshold).toEqual(1);
	expect(nodeACopy.quorumSet.validators).toHaveLength(1);
	expect(nodeACopy.unknown).toBeFalsy();

	const missingNodeCopy = nodes.find((node) => node.publicKey === 'B');
	expect(missingNodeCopy).toBeDefined();
	if (!missingNodeCopy) return;

	expect(missingNodeCopy.isValidating).toBeFalsy();

	const notSuccessfullyConnectedNodeCopy = nodes.find(
		(node) => node.publicKey === 'D'
	);
	expect(notSuccessfullyConnectedNodeCopy).toBeDefined();
	if (!notSuccessfullyConnectedNodeCopy) return;

	expect(notSuccessfullyConnectedNodeCopy.overLoaded).toBeFalsy();
	expect(notSuccessfullyConnectedNodeCopy.active).toBeTruthy();
	expect(notSuccessfullyConnectedNodeCopy.isValidating).toBeTruthy();
});
