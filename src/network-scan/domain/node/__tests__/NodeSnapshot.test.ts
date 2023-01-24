import NodeSnapShot from '../NodeSnapShot';
import NodeDetails from '../NodeDetails';
import NodeQuorumSet from '../NodeQuorumSet';
import { QuorumSet } from '@stellarbeat/js-stellarbeat-shared';
import NodeGeoDataLocation from '../NodeGeoDataLocation';

describe('NodeSnapshot', () => {
	test('copy', () => {
		const nodeSnapshot = new NodeSnapShot(new Date('2020-01-01'), 'host', 1);
		nodeSnapshot.versionStr = 'versionStr';
		nodeSnapshot.isp = 'isp';
		nodeSnapshot.overlayMinVersion = 1;
		nodeSnapshot.overlayVersion = 2;
		nodeSnapshot.ledgerVersion = 3;
		nodeSnapshot.homeDomain = 'homeDomain';
		nodeSnapshot.lastIpChange = new Date('2020-01-01');

		const nodeDetails: NodeDetails = NodeDetails.create({
			host: 'host',
			name: 'name',
			historyUrl: 'historyUrl',
			alias: 'alias'
		});
		nodeSnapshot.nodeDetails = nodeDetails;
		const nodeQuorumSet = NodeQuorumSet.create(
			'key',
			new QuorumSet(1, ['key1', 'key2'], [])
		);
		nodeSnapshot.quorumSet = nodeQuorumSet;
		const geoData = NodeGeoDataLocation.create({
			longitude: 1,
			latitude: 2,
			countryCode: 'countryCode',
			countryName: 'countryName'
		});
		nodeSnapshot.geoData = geoData;

		const copy = nodeSnapshot.copy(new Date('2020-01-02'));

		expect(copy.startDate).toEqual(new Date('2020-01-02'));
		expect(copy.homeDomain).toBe('homeDomain');
		expect(copy.versionStr).toBe('versionStr');
		expect(copy.isp).toBe('isp');
		expect(copy.overlayMinVersion).toBe(1);
		expect(copy.overlayVersion).toBe(2);
		expect(copy.ledgerVersion).toBe(3);
		expect(copy.lastIpChange).toEqual(new Date('2020-01-01'));
		expect(copy.nodeDetails).toEqual(nodeDetails);
		expect(copy.quorumSet).toEqual(nodeQuorumSet);
		expect(copy.geoData).toEqual(geoData);
	});
});
