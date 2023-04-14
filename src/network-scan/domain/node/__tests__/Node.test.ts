import { createDummyNode } from '../__fixtures__/createDummyNode';
import NodeDetails, { NodeDetailsProps } from '../NodeDetails';
import Node, { NodeProps } from '../Node';
import { createDummyPublicKey } from '../__fixtures__/createDummyPublicKey';
import NodeGeoDataLocation from '../NodeGeoDataLocation';
import NodeQuorumSet from '../NodeQuorumSet';
import { QuorumSet as QuorumSetDTO } from '@stellarbeat/js-stellarbeat-shared';
import NodeMeasurement from '../NodeMeasurement';

describe('Node', () => {
	describe('ip changes', () => {
		it('should change ip if ip changed', function () {
			const node = createDummyNode('localhost', 11625, new Date('2019-01-02'));
			node.updateIpPort('newHost', 11625, new Date('2020-01-02'));
			expect(node.ip).toBe('newHost');
			expect(node.port).toBe(11625);
		});

		it('should change ip if port changed', function () {
			const node = createDummyNode('localhost', 11625, new Date('2019-01-01'));
			node.updateIpPort('localhost', 11624, new Date('2020-01-02'));
			expect(node.ip).toBe('localhost');
			expect(node.port).toBe(11624);
		});

		it('should not change ip if no changes ', function () {
			const node = createDummyNode('localhost', 11625, new Date('2020-01-01'));
			node.updateIpPort('localhost', 11625, new Date('2020-01-02'));
			expect(node.ip).toBe('localhost');
			expect(node.port).toBe(11625);
			expect(node.snapshotStartDate).toEqual(new Date('2020-01-01'));
		});

		it('should not change ip if the last ip change was less than a day', function () {
			const node = createDummyNode(
				'localhost',
				11625,
				new Date('2020-01-01T00:00:00.000Z')
			);
			node.updateIpPort('newHost', 11625, new Date('2020-01-01T05:00:00.000Z'));
			expect(node.ip).toBe('localhost');
			expect(node.port).toBe(11625);
		});
	});

	describe('isp changed', () => {
		it('should change isp if isp changed', function () {
			const node = createDummyNode('localhost', 11625);
			node.updateIsp('newIsp', new Date('2020-01-02'));
			expect(node.isp).toBe('newIsp');
		});

		it('should not change isp if isp did not change', function () {
			const node = createDummyNode('localhost', 11625, new Date('2020-01-01'));
			node.updateIsp('newIsp', new Date('2020-01-02'));
			node.updateIsp('newIsp', new Date('2020-01-03'));
			expect(node.isp).toBe('newIsp');
			expect(node.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});
	});

	describe('home domain changed', () => {
		it('should change home domain if home domain changed', function () {
			const node = createDummyNode('localhost', 11625);
			node.updateHomeDomain('newHomeDomain', new Date('2020-01-02'));
			expect(node.homeDomain).toBe('newHomeDomain');
		});

		it('should not change home domain if home domain did not change', function () {
			const node = createDummyNode('localhost', 11625, new Date('2020-01-01'));
			node.updateHomeDomain('newHomeDomain', new Date('2020-01-02'));
			node.updateHomeDomain('newHomeDomain', new Date('2020-01-03'));
			expect(node.homeDomain).toBe('newHomeDomain');
			expect(node.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});
	});

	describe('versionStr changed', () => {
		it('should change versionStr if versionStr changed', function () {
			const node = createDummyNode('localhost', 11625);
			node.updateVersionStr('newVersionStr', new Date('2020-01-02'));
			expect(node.versionStr).toBe('newVersionStr');
		});

		it('should not change versionStr if versionStr did not change', function () {
			const node = createDummyNode('localhost', 11625, new Date('2020-01-01'));
			node.updateVersionStr('newVersionStr', new Date('2020-01-02'));
			node.updateVersionStr('newVersionStr', new Date('2020-01-03'));
			expect(node.versionStr).toBe('newVersionStr');
			expect(node.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});
	});

	describe('overlayVersion changed', () => {
		it('should change overlayVersion if overlayVersion changed', function () {
			const node = createDummyNode('localhost', 11625);
			node.updateOverlayVersion(2, new Date('2020-01-02'));
			expect(node.overlayVersion).toBe(2);
		});

		it('should not change overlayVersion if overlayVersion did not change', function () {
			const node = createDummyNode('localhost', 11625, new Date('2020-01-01'));
			node.updateOverlayVersion(2, new Date('2020-01-02'));
			node.updateOverlayVersion(2, new Date('2020-01-03'));
			expect(node.overlayVersion).toBe(2);
			expect(node.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});
	});

	describe('overlayMinVersion changed', () => {
		it('should change overlayMinVersion if overlayMinVersion changed', function () {
			const node = createDummyNode('localhost', 11625);
			node.updateOverlayMinVersion(2, new Date('2020-01-02'));
			expect(node.overlayMinVersion).toBe(2);
		});

		it('should not change overlayMinVersion if overlayMinVersion did not change', function () {
			const node = createDummyNode('localhost', 11625, new Date('2020-01-01'));
			node.updateOverlayMinVersion(2, new Date('2020-01-02'));
			node.updateOverlayMinVersion(2, new Date('2020-01-03'));
			expect(node.overlayMinVersion).toBe(2);
			expect(node.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});
	});

	describe('ledgerVersion changed', () => {
		it('should change ledgerVersion if ledgerVersion changed', function () {
			const node = createDummyNode('localhost', 11625);
			node.updateLedgerVersion(2, new Date('2020-01-02'));
			expect(node.ledgerVersion).toBe(2);
		});

		it('should not change ledgerVersion if ledgerVersion did not change', function () {
			const node = createDummyNode('localhost', 11625, new Date('2020-01-01'));
			node.updateLedgerVersion(2, new Date('2020-01-02'));
			node.updateLedgerVersion(2, new Date('2020-01-03'));
			expect(node.ledgerVersion).toBe(2);
			expect(node.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});
	});

	describe('nodeDetailsChanged', () => {
		it('should update and create new snapshot when node details changed for first time', function () {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			const time = new Date('2020-01-02');
			const details = NodeDetails.create(createNodeDetailsProps());
			node.updateDetails(details, time);
			expect(node.snapshotStartDate).toEqual(time);
			expect(node.details?.equals(details));
		});

		it('should not create new snapshot if node details did not change', function () {
			const nodeProps = createNodeProps();
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				nodeProps
			);
			node.updateDetails(
				NodeDetails.create(createNodeDetailsProps()),
				new Date('2020-01-02')
			);
			node.updateDetails(
				NodeDetails.create(createNodeDetailsProps()),
				new Date('2020-01-03')
			);

			expect(node.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});

		it('should update and create new snapshot when node details changed', function () {
			const nodeProps = createNodeProps();
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				nodeProps
			);
			const nodeDetailsProps = createNodeDetailsProps();
			node.updateDetails(
				NodeDetails.create(nodeDetailsProps),
				new Date('2020-01-02')
			);
			const newDetails = createNodeDetailsProps();
			newDetails.name = 'newName';
			node.updateDetails(
				NodeDetails.create(newDetails),
				new Date('2020-01-03')
			);

			expect(node.snapshotStartDate).toEqual(new Date('2020-01-03'));
		});

		function createNodeDetailsProps(): NodeDetailsProps {
			return {
				host: 'localhost',
				name: 'name',
				historyUrl: 'historyUrl',
				alias: 'alias'
			};
		}
	});

	describe('geoDataChanged', () => {
		it('should update and create new snapshot when geo data changed for first time', function () {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			const time = new Date('2020-01-02');
			const geoData = createGeoData();
			node.updateGeoData(geoData, time);
			expect(node.snapshotStartDate).toEqual(time);
			expect(node.geoData?.equals(geoData));
		});

		it('should not create new snapshot if geo data did not change', function () {
			const nodeProps = createNodeProps();
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				nodeProps
			);
			node.updateGeoData(createGeoData(), new Date('2020-01-02'));
			node.updateGeoData(createGeoData(), new Date('2020-01-03'));

			expect(node.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});

		it('should update and create new snapshot when geo data changed', function () {
			const nodeProps = createNodeProps();
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				nodeProps
			);
			const geoData = createGeoData();
			node.updateGeoData(geoData, new Date('2020-01-02'));
			const newGeoData = createGeoData('new country');
			node.updateGeoData(newGeoData, new Date('2020-01-03'));
			expect(node.snapshotStartDate).toEqual(new Date('2020-01-03'));
			expect(node.geoData?.countryName).toBe('new country');
		});

		function createGeoData(countryName = 'countryName'): NodeGeoDataLocation {
			return NodeGeoDataLocation.create({
				longitude: 1,
				countryCode: 'countryCode',
				countryName: countryName,
				latitude: 2
			});
		}
	});

	describe('quorumSetChanged', () => {
		it('should update and create new snapshot when quorum set changed for first time', function () {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			const time = new Date('2020-01-02');
			const quorumSet = createQuorumSet();
			node.updateQuorumSet(quorumSet, time);
			expect(node.snapshotStartDate).toEqual(time);
			expect(node.quorumSet?.equals(quorumSet));
		});

		it('should not create new snapshot if quorum set did not change', function () {
			const nodeProps = createNodeProps();
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				nodeProps
			);
			node.updateQuorumSet(createQuorumSet(), new Date('2020-01-02'));
			node.updateQuorumSet(createQuorumSet(), new Date('2020-01-03'));

			expect(node.snapshotStartDate).toEqual(new Date('2020-01-02'));
		});

		it('should update and create new snapshot when quorum set changed', function () {
			const nodeProps = createNodeProps();
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				nodeProps
			);
			const quorumSet = createQuorumSet();
			node.updateQuorumSet(quorumSet, new Date('2020-01-02'));

			const latestQuorumSet = createQuorumSet('new hash');
			node.updateQuorumSet(latestQuorumSet, new Date('2020-01-03'));
			expect(node.snapshotStartDate).toEqual(new Date('2020-01-03'));
			expect(node.quorumSet?.hash).toBe('new hash');
		});
	});

	describe('measurements', () => {
		test('latestMeasurement should return null if no measurements', () => {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			expect(node.latestMeasurement()).toBeNull();
		});

		test('should add measurement', () => {
			const time = new Date('2020-01-01');
			const node = Node.create(time, createDummyPublicKey(), createNodeProps());
			const measurement = new NodeMeasurement(time, node);
			node.addMeasurement(measurement);
			expect(node.latestMeasurement()).toEqual(measurement);
		});
	});

	describe('isValidator', () => {
		it('should return true if node is validator', () => {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			node.updateQuorumSet(createQuorumSet(), new Date('2020-01-02'));
			expect(node.isValidator()).toBe(true);
		});

		it('should return false if node is not validator', () => {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			expect(node.isValidator()).toBe(false);
		});
	});

	describe('isValidating', () => {
		it('should return true if node is validating', () => {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			const measurement = new NodeMeasurement(new Date('2020-01-02'), node);
			measurement.isValidating = true;
			node.addMeasurement(measurement);

			expect(node.isValidating()).toBe(true);
		});
		it('should return false', function () {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			const measurement = new NodeMeasurement(new Date('2020-01-02'), node);
			measurement.isValidating = false;
			node.addMeasurement(measurement);

			expect(node.isValidating()).toBe(false);
		});

		it('should return false if no latest measurement', function () {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			expect(node.isValidating()).toBe(false);
		});
	});

	describe('isTrackingFullValidator', () => {
		it('should return true if history archive is up-to-date', function () {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			const measurement = new NodeMeasurement(new Date('2020-01-02'), node);
			measurement.isFullValidator = true;
			node.addMeasurement(measurement);

			expect(node.isTrackingFullValidator()).toBe(true);
		});

		it('should return false if history archive is not up-to-date', function () {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			const measurement = new NodeMeasurement(new Date('2020-01-02'), node);
			measurement.isFullValidator = false;
			node.addMeasurement(measurement);

			expect(node.isTrackingFullValidator()).toBe(false);
		});

		it('should return false if no measurement', function () {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			expect(node.isTrackingFullValidator()).toBe(false);
		});
	});
	describe('isWatcher', () => {
		it('should return true if node is watcher', () => {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			expect(node.isWatcher()).toBe(true);
		});

		it('should return false if node is not watcher', () => {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			node.updateQuorumSet(createQuorumSet(), new Date('2020-01-02'));
			expect(node.isWatcher()).toBe(false);
		});
	});

	describe('isActive', () => {
		it('should return true if node is active', () => {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			const measurement = new NodeMeasurement(new Date('2020-01-02'), node);
			measurement.isActive = true;
			node.addMeasurement(measurement);
			expect(node.isActive()).toBe(true);
		});

		it('should return false if node is not active', () => {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			const measurement = new NodeMeasurement(new Date('2020-01-02'), node);
			measurement.isActive = false;
			node.addMeasurement(measurement);
			expect(node.isActive()).toBe(false);
		});

		it('should return false if no measurement', () => {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			expect(node.isActive()).toBe(false);
		});
	});

	describe('demote to watcher', () => {
		it('should demote to watcher', () => {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			node.updateQuorumSet(createQuorumSet(), new Date('2020-01-02'));
			expect(node.isWatcher()).toBe(false);
			node.demoteToWatcher(new Date('2020-01-03'));
			expect(node.isWatcher()).toBe(true);
		});
		it('should not demote to watcher if it is not necessary', function () {
			const node = Node.create(
				new Date('2020-01-01'),
				createDummyPublicKey(),
				createNodeProps()
			);
			expect(node.isWatcher()).toBe(true);
			node.demoteToWatcher(new Date('2020-01-03'));
			expect(node.isWatcher()).toBe(true);
			expect(node.snapshotStartDate).toEqual(new Date('2020-01-01'));
		});
	});
});

function createNodeProps(): NodeProps {
	return {
		ip: 'localhost',
		port: 11625
	};
}
function createQuorumSet(hash = 'hash'): NodeQuorumSet {
	return NodeQuorumSet.create(hash, new QuorumSetDTO(1, ['a'], []));
}
