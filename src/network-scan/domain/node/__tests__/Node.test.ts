import { createDummyNode } from '../__fixtures__/createDummyNode';
import NodeDetails, { NodeDetailsProps } from '../NodeDetails';
import Node, { NodeProps } from '../Node';
import { createDummyPublicKey } from '../__fixtures__/createDummyPublicKey';
import NodeGeoDataLocation from '../NodeGeoDataLocation';
import NodeQuorumSet from '../NodeQuorumSet';
import { QuorumSet as QuorumSetDTO } from '@stellarbeat/js-stellar-domain';

describe('ip changes', () => {
	it('should change ip if ip changed', function () {
		const node = createDummyNode('localhost', 11625);
		node.updateIpPort('newHost', 11625, new Date('2020-01-02'));
		expect(node.ip).toBe('newHost');
		expect(node.port).toBe(11625);
	});

	it('should change ip if port changed', function () {
		const node = createDummyNode('localhost', 11625, new Date('2020-01-01'));
		node.updateIpPort('localhost', 11624, new Date('2020-01-02'));
		expect(node.ip).toBe('localhost');
		expect(node.port).toBe(11624);
	});

	it('should not change ip if no changes ', function () {
		const node = createDummyNode('localhost', 11625, new Date('2020-01-01'));
		node.updateIpPort('localhost', 11625, new Date('2020-01-02'));
		expect(node.ip).toBe('localhost');
		expect(node.port).toBe(11625);
	});

	it('should not change ip if the last ip change was less than a day', function () {
		const node = createDummyNode(
			'localhost',
			11625,
			new Date('2020-01-01T00:00:00.000Z')
		);
		node.updateIpPort('newHost', 11625, new Date('2020-01-02T00:00:00.000Z'));
		node.updateIpPort('newHost2', 11625, new Date('2020-01-02T23:59:59.999Z'));
		expect(node.ip).toBe('newHost');
		expect(node.port).toBe(11625);
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
		nodeProps.details = NodeDetails.create(createNodeDetailsProps());
		const node = Node.create(
			new Date('2020-01-01'),
			createDummyPublicKey(),
			nodeProps
		);
		node.updateDetails(
			NodeDetails.create(createNodeDetailsProps()),
			new Date('2020-01-02')
		);

		expect(node.snapshotStartDate).toEqual(new Date('2020-01-01'));
	});

	it('should update and create new snapshot when node details changed', function () {
		const nodeProps = createNodeProps();
		nodeProps.details = NodeDetails.create(createNodeDetailsProps());
		const node = Node.create(
			new Date('2020-01-01'),
			createDummyPublicKey(),
			nodeProps
		);
		const nodeDetailsProps = createNodeDetailsProps();
		nodeDetailsProps.isp = 'new isp';
		node.updateDetails(
			NodeDetails.create(nodeDetailsProps),
			new Date('2020-01-02')
		);
		expect(node.snapshotStartDate).toEqual(new Date('2020-01-02'));
		expect(node.details?.isp).toBe('new isp');
	});

	function createNodeDetailsProps(): NodeDetailsProps {
		return {
			host: 'localhost',
			name: 'name',
			homeDomain: 'homeDomain',
			historyUrl: 'historyUrl',
			alias: 'alias',
			isp: 'isp',
			ledgerVersion: 1,
			overlayMinVersion: 1,
			versionStr: 'versionStr',
			overlayVersion: 1
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
		nodeProps.geoData = createGeoData();
		const node = Node.create(
			new Date('2020-01-01'),
			createDummyPublicKey(),
			nodeProps
		);
		node.updateGeoData(createGeoData(), new Date('2020-01-02'));

		expect(node.snapshotStartDate).toEqual(new Date('2020-01-01'));
	});

	it('should update and create new snapshot when geo data changed', function () {
		const nodeProps = createNodeProps();
		nodeProps.geoData = createGeoData();
		const node = Node.create(
			new Date('2020-01-01'),
			createDummyPublicKey(),
			nodeProps
		);
		const geoData = createGeoData('new country');
		node.updateGeoData(geoData, new Date('2020-01-02'));
		expect(node.snapshotStartDate).toEqual(new Date('2020-01-02'));
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
		nodeProps.quorumSet = createQuorumSet();
		const node = Node.create(
			new Date('2020-01-01'),
			createDummyPublicKey(),
			nodeProps
		);
		node.updateQuorumSet(createQuorumSet(), new Date('2020-01-02'));

		expect(node.snapshotStartDate).toEqual(new Date('2020-01-01'));
	});

	it('should update and create new snapshot when quorum set changed', function () {
		const nodeProps = createNodeProps();
		nodeProps.quorumSet = createQuorumSet();
		const node = Node.create(
			new Date('2020-01-01'),
			createDummyPublicKey(),
			nodeProps
		);
		const quorumSet = createQuorumSet('new hash');
		node.updateQuorumSet(quorumSet, new Date('2020-01-02'));
		expect(node.snapshotStartDate).toEqual(new Date('2020-01-02'));
		expect(node.quorumSet?.hash).toBe('new hash');
	});

	function createQuorumSet(hash = 'hash'): NodeQuorumSet {
		return NodeQuorumSet.create(hash, new QuorumSetDTO(1, ['a'], []));
	}
});

function createNodeProps(): NodeProps {
	return {
		ip: 'localhost',
		port: 11625,
		details: null,
		geoData: null,
		quorumSet: null
	};
}
