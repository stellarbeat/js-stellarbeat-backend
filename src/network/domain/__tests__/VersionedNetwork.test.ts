import { VersionedNetwork } from '../VersionedNetwork';
import { NetworkId } from '../NetworkId';
import { NetworkConfiguration } from '../NetworkConfiguration';
import { VersionedEntity } from '../VersionedEntity';
import { Snapshot } from '../Snapshot';

it('should not update the same configuration', function () {
	const networkId = new NetworkId('test');
	const networkConfiguration = new NetworkConfiguration(1, 2, 3, 'my-version');
	const startDate = new Date();
	const network = VersionedNetwork.create(
		startDate,
		networkId,
		'test',
		networkConfiguration
	);

	const newSnapshot = network.createSnapshotWorkingCopy(new Date());
	newSnapshot.configuration = networkConfiguration;
	network.addSnapshot(newSnapshot);
	expect(network.snapshots.length).toBe(1);
	expect(network.snapshotStartDate).toEqual(startDate);
});

it('should create a new version', function () {
	const networkId = new NetworkId('test');
	const networkConfiguration = new NetworkConfiguration(1, 2, 3, 'my-version');
	const startDate = new Date('2020-01-01');
	const network = VersionedNetwork.create(
		startDate,
		networkId,
		'test',
		networkConfiguration
	);
	const newConfiguration = new NetworkConfiguration(
		2,
		3,
		4,
		'my-other-version'
	);

	const nextDate = new Date('2020-01-02');
	const newSnapshot = network.createSnapshotWorkingCopy(nextDate);
	newSnapshot.configuration = newConfiguration;
	network.addSnapshot(newSnapshot);

	expect(network.snapshots.length).toBe(2);
	expect(network.snapshotEndDate).toStrictEqual(VersionedEntity.MAX_DATE);
	expect(network.configuration.equals(newConfiguration)).toBe(true);
	expect(network.snapshotEndDate).toStrictEqual(Snapshot.MAX_DATE);
	expect(network.snapshotStartDate).toStrictEqual(nextDate);
	expect(network.snapshots[0].endDate).toStrictEqual(nextDate);
});
