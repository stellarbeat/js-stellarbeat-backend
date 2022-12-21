import { VersionedNetwork } from '../VersionedNetwork';
import { NetworkId } from '../NetworkId';
import { NetworkConfiguration } from '../NetworkConfiguration';
import { NetworkConfigurationChange } from '../NetworkConfigurationChange';
import { VersionedEntity } from '../VersionedEntity';

it('should not update the same configuration', function () {
	const networkId = new NetworkId('test');
	const networkConfiguration = new NetworkConfiguration(1, 2, 3, 'my-version');
	const network = new VersionedNetwork(
		networkId,
		networkConfiguration,
		new Date()
	);

	network.updateConfiguration(networkConfiguration);
	expect(network.changes.length).toBe(0);
});

it('should create a new version', function () {
	const networkId = new NetworkId('test');
	const networkConfiguration = new NetworkConfiguration(1, 2, 3, 'my-version');
	const startDate = new Date('2020-01-01');
	const firstVersion = new VersionedNetwork(
		networkId,
		networkConfiguration,
		startDate
	);
	const newConfiguration = new NetworkConfiguration(
		2,
		3,
		4,
		'my-other-version'
	);
	firstVersion.updateConfiguration(newConfiguration);
	const nextDate = new Date('2020-01-02');

	const nextVersion = firstVersion.startNewVersion(nextDate);
	expect(nextVersion.changes.length).toBe(0);
	expect(nextVersion.networkId.equals(networkId)).toBeTruthy();
	expect(nextVersion.endDate).toBe(VersionedEntity.MAX_DATE);
	expect(nextVersion.configuration.equals(newConfiguration)).toBe(true);
	expect(firstVersion.endDate).toBe(nextDate);
	expect(nextVersion.startDate).toBe(nextDate);
	expect(nextVersion.previousVersion).toEqual(firstVersion);
	console.log(nextVersion);
	console.log(firstVersion);
});

it('should update to a new configuration and track the changes ', function () {
	const networkId = new NetworkId('test');
	const network = new VersionedNetwork(
		networkId,
		new NetworkConfiguration(1, 2, 3, 'my-version'),
		new Date()
	);

	const newConfiguration = new NetworkConfiguration(
		2,
		3,
		4,
		'my-other-version'
	);
	network.updateConfiguration(newConfiguration);
	expect(network.changes).toHaveLength(1);
	expect(network.changes[0]).toBeInstanceOf(NetworkConfigurationChange);
	expect(network.changes[0].from).toEqual({
		ledgerVersion: 1,
		overlayMinVersion: 2,
		overlayVersion: 3,
		versionString: 'my-version'
	});
	expect(network.changes[0].to).toEqual({
		ledgerVersion: 2,
		overlayMinVersion: 3,
		overlayVersion: 4,
		versionString: 'my-other-version'
	});
	expect(network.configuration.equals(newConfiguration)).toBeTruthy();
});
