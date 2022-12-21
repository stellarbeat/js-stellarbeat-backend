import { VersionedNetwork } from '../VersionedNetwork';
import { NetworkId } from '../NetworkId';
import { NetworkConfiguration } from '../NetworkConfiguration';
import { NetworkConfigurationChange } from '../NetworkConfigurationChange';
import { Version } from '../Version';

it('should not update the same configuration', function () {
	const networkId = new NetworkId('test');
	const networkConfiguration = new NetworkConfiguration(1, 2, 3, 'my-version');
	const network = VersionedNetwork.create(networkId, networkConfiguration);

	network.updateConfiguration(networkConfiguration);
	expect(network.changes.length).toBe(0);
});

it('should create a new version', function () {
	const networkId = new NetworkId('test');
	const networkConfiguration = new NetworkConfiguration(1, 2, 3, 'my-version');
	const startDate = new Date('2020-01-01');
	const network = VersionedNetwork.create(
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
	network.updateConfiguration(newConfiguration);
	const nextDate = new Date('2020-01-02');
	network.createNewVersion(nextDate);
	expect(network.changes.length).toBe(0);
	expect(network.startDate).toBe(nextDate);
	expect(network.endDate).toBe(Version.MAX_DATE);
});

it('should archive an older version', function () {
	const networkId = new NetworkId('test');
	const networkConfiguration = new NetworkConfiguration(1, 2, 3, 'my-version');
	const startDate = new Date('2020-01-01');
	const network = VersionedNetwork.create(
		networkId,
		networkConfiguration,
		startDate
	);

	const endDate = new Date('2020-01-03');
	network.archiveThisVersion(endDate);
	expect(network.endDate).toBe(endDate);
});

it('should update to a new configuration and track the changes ', function () {
	const networkId = new NetworkId('test');
	const network = VersionedNetwork.create(
		networkId,
		new NetworkConfiguration(1, 2, 3, 'my-version')
	);

	const newConfiguration = new NetworkConfiguration(
		2,
		3,
		4,
		'my-other-version'
	);
	network.updateConfiguration(newConfiguration);
	expect(network.previousVersionShouldBeArchived()).toBe(false);
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
