import { createDummyNode } from '../../__fixtures__/createDummyNode';
import Node from '../../Node';
import { NodeScan } from '../NodeScan';
import { PeerNode } from '@stellarbeat/js-stellar-node-crawler';
import { createDummyPublicKeyString } from '../../__fixtures__/createDummyPublicKey';
import NodeDetails from '../../NodeDetails';
import NodeMeasurement from '../../NodeMeasurement';
import NodeGeoDataLocation from '../../NodeGeoDataLocation';
import { NodeTomlInfo } from '../NodeTomlInfo';
import { QuorumSet } from '@stellarbeat/js-stellarbeat-shared';
import NodeQuorumSet from '../../NodeQuorumSet';
import { StellarCoreVersion } from '../../../network/StellarCoreVersion';

describe('NodeScan', () => {
	let activeNode: Node;
	let missingNode: Node;
	let archivedNode: Node;

	beforeEach(() => {
		const time = new Date('2020-01-01T00:00:00.000Z');
		activeNode = createDummyNode('localhost', 1, time);
		missingNode = createDummyNode('localhost2', 2, time);
		archivedNode = createDummyNode('localhost3', 3, time);
		archivedNode.archive(new Date('2020-01-02T00:00:00.000Z'));
	});

	it('should update latest ledgers', function () {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		const nodeScan = new NodeScan(scanTime, [activeNode]);
		nodeScan.processCrawl([], [], [1, 2, 3], BigInt(4), scanTime);
		expect(nodeScan.latestLedger).toEqual(BigInt(4));
		expect(nodeScan.latestLedgerCloseTime).toEqual(scanTime);
		expect(nodeScan.processedLedgers).toEqual([1, 2, 3]);
	});

	it('should update existing nodes from crawl', function () {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		const nodeScan = new NodeScan(scanTime, [activeNode]);
		const peerNode = new PeerNode(activeNode.publicKey.value);
		peerNode.ip = 'new ip';
		peerNode.port = 1234;
		nodeScan.processCrawl([peerNode]);
		expect(activeNode.ip).toEqual(peerNode.ip);
		expect(activeNode.port).toEqual(peerNode.port);
		expect(activeNode.snapshotStartDate).toEqual(scanTime);
		expect(activeNode.latestMeasurement()).not.toBeNull();
		expect(activeNode.latestMeasurement()?.time).toEqual(scanTime);
	});

	it('should add new nodes from crawl', function () {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		const nodeScan = new NodeScan(scanTime, [activeNode]);
		const peerNode = new PeerNode(createDummyPublicKeyString());
		peerNode.ip = 'new ip';
		peerNode.port = 1234;
		const invalidPeerNodes = nodeScan.processCrawl([peerNode]);
		expect(invalidPeerNodes).toHaveLength(0);
		expect(nodeScan.nodes).toHaveLength(2);
		expect(nodeScan.nodes[1].ip).toEqual(peerNode.ip);
		expect(nodeScan.nodes[1].port).toEqual(peerNode.port);
		expect(nodeScan.nodes[1].snapshotStartDate).toEqual(scanTime);
		expect(nodeScan.nodes[1].latestMeasurement()).not.toBeNull();
		expect(nodeScan.nodes[1].latestMeasurement()?.time).toEqual(scanTime);
	});

	it('should not add peer-nodes with invalid public keys', function () {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		const nodeScan = new NodeScan(scanTime, [activeNode]);
		const peerNode = new PeerNode('invalid public key');
		peerNode.ip = 'new ip';
		peerNode.port = 1234;
		const invalidPeerNodes = nodeScan.processCrawl([peerNode]);
		expect(invalidPeerNodes).toHaveLength(1);
		expect(nodeScan.nodes).toHaveLength(1);
	});

	it('should not add peer-nodes with missing port', function () {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		const nodeScan = new NodeScan(scanTime, [activeNode]);
		const peerNode = new PeerNode(createDummyPublicKeyString());
		peerNode.ip = 'new ip';
		const invalidPeerNodes = nodeScan.processCrawl([peerNode]);
		expect(invalidPeerNodes).toHaveLength(1);
		expect(nodeScan.nodes).toHaveLength(1);
	});

	it('should not add peer-nodes with missing ip', function () {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		const nodeScan = new NodeScan(scanTime, [activeNode]);
		const peerNode = new PeerNode(createDummyPublicKeyString());
		peerNode.port = 1234;
		const invalidPeerNodes = nodeScan.processCrawl([peerNode]);
		expect(invalidPeerNodes).toHaveLength(1);
		expect(nodeScan.nodes).toHaveLength(1);
	});

	it('should not create a new node if it is archived, but instead un-archive it', function () {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		const nodeScan = new NodeScan(scanTime, [activeNode]);
		const peerNode = new PeerNode(archivedNode.publicKey.value);
		peerNode.ip = 'new ip';
		peerNode.port = 1234;
		nodeScan.processCrawl([peerNode], [archivedNode]);
		expect(archivedNode.ip).toEqual(peerNode.ip);
		expect(archivedNode.port).toEqual(peerNode.port);
		expect(archivedNode.snapshotStartDate).toEqual(scanTime);
		expect(archivedNode.latestMeasurement()).not.toBeNull();
		expect(archivedNode.latestMeasurement()?.time).toEqual(scanTime);
		expect(nodeScan.nodes).toHaveLength(2);
	});

	it('should un-archive node, even if there are no changes to snapshot', function () {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		const nodeScan = new NodeScan(scanTime, [activeNode]);
		const peerNode = new PeerNode(archivedNode.publicKey.value);
		nodeScan.processCrawl([peerNode], [archivedNode]);
		expect(archivedNode.snapshotStartDate).toEqual(scanTime);
		expect(archivedNode.latestMeasurement()).not.toBeNull();
		expect(archivedNode.latestMeasurement()?.time).toEqual(scanTime);
		expect(nodeScan.nodes).toHaveLength(2);
	});

	it('should add a measurement for nodes missing in the crawl', function () {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		const nodeScan = new NodeScan(scanTime, [activeNode, missingNode]);
		nodeScan.processCrawl([]);
		expect(missingNode.latestMeasurement()).not.toBeNull();
		expect(missingNode.latestMeasurement()?.time).toEqual(scanTime);
	});

	test('getPublicKeys', () => {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		const nodeScan = new NodeScan(scanTime, [activeNode, missingNode]);
		const publicKeys = nodeScan.getPublicKeys();
		expect(publicKeys).toHaveLength(2);
		expect(publicKeys).toContain(activeNode.publicKey.value);
		expect(publicKeys).toContain(missingNode.publicKey.value);
	});

	test('updateHomeDomains', () => {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		const nodeScan = new NodeScan(scanTime, [activeNode, missingNode]);
		const homeDomains = new Map<string, string>();
		homeDomains.set(activeNode.publicKey.value, 'new home domain');
		nodeScan.updateHomeDomains(homeDomains);
		expect(activeNode.homeDomain).toEqual('new home domain');
		expect(missingNode.homeDomain).toBeNull();
	});

	test('updateWithTomlInfo', () => {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		activeNode.updateHomeDomain('domain', scanTime);

		const nodeScan = new NodeScan(scanTime, [activeNode, missingNode]);
		const tomlInfo = new Set<NodeTomlInfo>();
		tomlInfo.add({
			publicKey: activeNode.publicKey.value,
			homeDomain: activeNode.homeDomain as string,
			name: 'new name',
			historyUrl: 'new history url',
			alias: 'new alias',
			host: 'new host'
		});

		nodeScan.updateWithTomlInfo(tomlInfo);
		expect(activeNode.details?.name).toEqual('new name');
		expect(activeNode.details?.historyUrl).toEqual('new history url');
		expect(activeNode.details?.alias).toEqual('new alias');
		expect(activeNode.details?.host).toEqual('new host');
	});

	test('getHomeDomains', () => {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		activeNode.updateHomeDomain('domain', scanTime);
		const nodeScan = new NodeScan(scanTime, [activeNode, missingNode]);
		const homeDomains = nodeScan.getHomeDomains();
		expect(homeDomains).toHaveLength(1);
		expect(homeDomains).toContain(activeNode.homeDomain);
	});

	test('getHistoryArchiveUrls', () => {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		activeNode.updateDetails(
			NodeDetails.create({
				historyUrl: 'history url',
				host: 'host',
				alias: 'alias',
				name: 'name'
			}),
			scanTime
		);

		const nodeScan = new NodeScan(scanTime, [activeNode, missingNode]);
		const historyArchiveUrls = nodeScan.getHistoryArchiveUrls();
		expect(historyArchiveUrls.size).toEqual(1);
		expect(historyArchiveUrls.get(activeNode.publicKey.value)).toEqual(
			'history url'
		);
	});

	test('updateHistoryArchiveUpToDateStatus', () => {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		activeNode.updateDetails(
			NodeDetails.create({
				historyUrl: 'history url',
				host: 'host',
				alias: 'alias',
				name: 'name'
			}),
			scanTime
		);
		activeNode.addMeasurement(new NodeMeasurement(scanTime, activeNode));

		const nodeScan = new NodeScan(scanTime, [activeNode, missingNode]);
		const historyArchiveUpToDateStatus = new Map<string, boolean>();
		historyArchiveUpToDateStatus.set(activeNode.publicKey.value, true);
		nodeScan.updateHistoryArchiveUpToDateStatus(
			new Set([activeNode.publicKey.value])
		);
		expect(activeNode.latestMeasurement()?.isFullValidator).toEqual(true);
	});

	test('updateHistoryArchiveVerificationStatus', () => {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		activeNode.updateDetails(
			NodeDetails.create({
				historyUrl: 'history url',
				host: 'host',
				alias: 'alias',
				name: 'name'
			}),
			scanTime
		);
		activeNode.addMeasurement(new NodeMeasurement(scanTime, activeNode));

		const nodeScan = new NodeScan(scanTime, [activeNode, missingNode]);
		const historyArchiveVerificationStatus = new Map<string, boolean>();
		historyArchiveVerificationStatus.set(activeNode.publicKey.value, true);
		nodeScan.updateHistoryArchiveVerificationStatus(
			new Set([activeNode.publicKey.value])
		);
		expect(activeNode.latestMeasurement()?.historyArchiveHasError).toEqual(
			true
		);
	});

	test('getModifiedIPs', () => {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		activeNode.updateIpPort('new ip', 1234, scanTime);

		const nodeScan = new NodeScan(scanTime, [activeNode, missingNode]);
		const modifiedIPs = nodeScan.getModifiedIPs();
		expect(modifiedIPs).toHaveLength(1);
		expect(modifiedIPs).toContain(activeNode.ip);
	});

	test('updateIndexes', () => {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		activeNode.addMeasurement(new NodeMeasurement(scanTime, activeNode));
		missingNode.addMeasurement(new NodeMeasurement(scanTime, missingNode));
		const nodeScan = new NodeScan(scanTime, [activeNode, missingNode]);
		const indexes = new Map<string, number>();
		indexes.set(activeNode.publicKey.value, 1);
		nodeScan.updateIndexes(indexes);
		expect(activeNode.latestMeasurement()?.index).toEqual(1);
		expect(missingNode.latestMeasurement()?.index).toEqual(0);
	});

	test('updateGeoDataAndISP', () => {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		const nodeScan = new NodeScan(scanTime, [activeNode, missingNode]);
		const geoDataAndIsp = new Map<
			string,
			{ geo: NodeGeoDataLocation; isp: string }
		>();
		geoDataAndIsp.set(activeNode.ip, {
			isp: 'isp',
			geo: NodeGeoDataLocation.create({
				longitude: 1,
				latitude: 2,
				countryName: 'countryName',
				countryCode: 'countryCode'
			})
		});
		nodeScan.updateGeoDataAndISP(geoDataAndIsp);
		expect(activeNode.geoData?.longitude).toEqual(1);
		expect(activeNode.isp).toEqual('isp');
		expect(missingNode.geoData).toBeNull();
	});

	test('getActiveWatchersCount', () => {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		const nodeScan = new NodeScan(scanTime, [activeNode, missingNode]);
		const activeMeasurement = new NodeMeasurement(scanTime, activeNode);
		activeMeasurement.isActive = true;
		activeNode.addMeasurement(activeMeasurement);
		const missingNodeMeasurement = new NodeMeasurement(scanTime, missingNode);
		missingNodeMeasurement.isActive = false;
		missingNode.addMeasurement(new NodeMeasurement(scanTime, missingNode));
		expect(nodeScan.getActiveWatchersCount()).toEqual(1);
	});

	test('getActiveValidatorsCount', () => {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		const validatingValidator = createDummyNode();
		validatingValidator.updateQuorumSet(
			NodeQuorumSet.create('key', new QuorumSet(1, [], [])),
			scanTime
		);
		const validatingMeasurement = new NodeMeasurement(
			scanTime,
			validatingValidator
		);
		validatingMeasurement.isValidating = true;
		const notValidatingValidator = createDummyNode();
		validatingValidator.addMeasurement(validatingMeasurement);

		notValidatingValidator.updateQuorumSet(
			NodeQuorumSet.create('key', new QuorumSet(1, [], [])),
			scanTime
		);
		const notValidatingMeasurement = new NodeMeasurement(
			scanTime,
			notValidatingValidator
		);
		notValidatingMeasurement.isValidating = false;
		notValidatingValidator.addMeasurement(notValidatingMeasurement);

		const watcher = createDummyNode();
		const watcherMeasurement = new NodeMeasurement(scanTime, watcher);
		watcherMeasurement.isActive = true;

		const nodeScan = new NodeScan(scanTime, [
			validatingValidator,
			notValidatingValidator,
			watcher
		]);

		expect(nodeScan.getActiveValidatorsCount()).toEqual(1);
	});

	test('getActiveFullValidatorsCount', () => {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		const fullValidator = createDummyNode();
		fullValidator.updateQuorumSet(
			NodeQuorumSet.create(
				'key',
				new QuorumSet(1, [], [new QuorumSet(1, [], [])])
			),
			scanTime
		);
		const fullValidatorMeasurement = new NodeMeasurement(
			scanTime,
			fullValidator
		);
		fullValidatorMeasurement.isValidating = true;
		fullValidatorMeasurement.isFullValidator = true;
		fullValidator.addMeasurement(fullValidatorMeasurement);

		const notFullValidator = createDummyNode();
		const notFullValidatorMeasurement = new NodeMeasurement(
			scanTime,
			notFullValidator
		);
		notFullValidator.updateQuorumSet(
			NodeQuorumSet.create('key', new QuorumSet(1, [], [])),
			scanTime
		);
		notFullValidatorMeasurement.isValidating = true;
		notFullValidatorMeasurement.isFullValidator = false;
		notFullValidator.addMeasurement(notFullValidatorMeasurement);

		const watcher = createDummyNode();
		const watcherMeasurement = new NodeMeasurement(scanTime, watcher);
		watcherMeasurement.isActive = true;

		const nodeScan = new NodeScan(scanTime, [
			fullValidator,
			notFullValidator,
			watcher
		]);

		expect(nodeScan.getActiveFullValidatorsCount()).toEqual(1);
	});

	test('updateStellarCoreVersionBehindStatus', () => {
		const scanTime = new Date('2020-01-03T00:00:00.000Z');
		const nodeScan = new NodeScan(scanTime, [activeNode, missingNode]);
		activeNode.addMeasurement(new NodeMeasurement(scanTime, activeNode));
		missingNode.addMeasurement(new NodeMeasurement(scanTime, missingNode));
		activeNode.updateVersionStr('1.0.0', scanTime);
		missingNode.updateVersionStr('2.0.0', scanTime);
		const stellarCoreVersion = StellarCoreVersion.create('2.0.0');
		if (stellarCoreVersion.isErr())
			throw new Error('StellarCoreVersion.create failed');
		nodeScan.updateStellarCoreVersionBehindStatus(stellarCoreVersion.value);
		expect(activeNode.latestMeasurement()?.stellarCoreVersionBehind).toEqual(
			true
		);
		expect(missingNode.latestMeasurement()?.stellarCoreVersionBehind).toEqual(
			false
		);
	});
});
