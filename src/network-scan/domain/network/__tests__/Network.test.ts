import { Network } from '../Network';
import { NetworkId } from '../NetworkId';
import { Snapshot } from '../../../../core/domain/Snapshot';
import { createDummyNetworkProps } from '../__fixtures__/createDummyNetworkProps';
import { NetworkNameChanged } from '../change/NetworkNameChanged';
import { NetworkMaxLedgerVersionChanged } from '../change/NetworkMaxLedgerVersionChanged';
import { OverlayVersionRange } from '../OverlayVersionRange';
import { NetworkOverlayVersionRangeChanged } from '../change/NetworkOverlayVersionRangeChanged';
import { StellarCoreVersion } from '../StellarCoreVersion';
import { NetworkStellarCoreVersionChanged } from '../change/NetworkStellarCoreVersionChanged';
import { NetworkQuorumSetConfiguration } from '../NetworkQuorumSetConfiguration';
import { NetworkQuorumSetConfigurationChanged } from '../change/NetworkQuorumSetConfigurationChanged';

it('should create a first snapshot', function () {
	const time = new Date();
	const networkId = new NetworkId('test');
	const props = createDummyNetworkProps();
	const network = Network.create(time, networkId, 'public', props);
	expect(network.snapshotStartDate).toEqual(time);
	expect(network.snapshotEndDate).toEqual(Snapshot.MAX_DATE);
	expect(network.name).toEqual(props.name);
	expect(
		network.overlayVersionRange.equals(props.overlayVersionRange)
	).toBeTruthy();
	expect(
		network.stellarCoreVersion.equals(props.stellarCoreVersion)
	).toBeTruthy();
	expect(
		network.quorumSetConfiguration.equals(props.quorumSetConfiguration)
	).toBeTruthy();
	expect(network.changes.length).toEqual(0);
});

it('should update name and register the change', function () {
	const time = new Date('2020-01-01');
	const network = createNetwork(time);
	const oldName = network.name;
	const newName = 'other network name';
	network.updateName(newName, new Date('2020-01-02'));
	expect(network.name).toEqual(newName);
	expect(network.changes.length).toEqual(1);
	expect(network.changes[0]).toBeInstanceOf(NetworkNameChanged);
	expect(network.changes[0].networkId.equals(network.networkId)).toBeTruthy();
	expect(network.changes[0].time).toEqual(new Date('2020-01-02'));
	expect(network.changes[0].from.value).toEqual(oldName);
	expect(network.changes[0].to.value).toEqual(newName);
	network.updateName(newName, new Date('2020-01-03'));
	expect(network.changes.length).toEqual(1);
});

it('should update maxLedgerVersion and register the change', function () {
	const time = new Date('2020-01-01');
	const network = createNetwork(time);
	const oldMaxLedgerVersion = network.maxLedgerVersion;
	const newMaxLedgerVersion = oldMaxLedgerVersion + 1;
	network.updateMaxLedgerVersion(newMaxLedgerVersion, new Date('2020-01-02'));
	expect(network.maxLedgerVersion).toEqual(newMaxLedgerVersion);
	expect(network.changes.length).toEqual(1);
	expect(network.changes[0]).toBeInstanceOf(NetworkMaxLedgerVersionChanged);
	expect(network.changes[0].networkId.equals(network.networkId)).toBeTruthy();
	expect(network.changes[0].time).toEqual(new Date('2020-01-02'));
	expect(network.changes[0].from.value).toEqual(oldMaxLedgerVersion);
	expect(network.changes[0].to.value).toEqual(newMaxLedgerVersion);
	network.updateMaxLedgerVersion(newMaxLedgerVersion, new Date('2020-01-03'));
	expect(network.changes.length).toEqual(1);
});

it('should update overlayVersionRange and register the change', function () {
	const time = new Date('2020-01-01');
	const network = createNetwork(time);
	const oldOverlayVersionRange = network.overlayVersionRange;
	const newOverlayVersionRangeOrError = OverlayVersionRange.create(2, 3);
	if (newOverlayVersionRangeOrError.isErr())
		throw newOverlayVersionRangeOrError.error;
	const newOverlayVersionRange = newOverlayVersionRangeOrError.value;
	network.updateOverlayVersionRange(
		newOverlayVersionRange,
		new Date('2020-01-02')
	);
	expect(
		network.overlayVersionRange.equals(newOverlayVersionRange)
	).toBeTruthy();
	expect(network.changes.length).toEqual(1);
	expect(network.changes[0]).toBeInstanceOf(NetworkOverlayVersionRangeChanged);
	expect(network.changes[0].networkId.equals(network.networkId)).toBeTruthy();
	expect(network.changes[0].time).toEqual(new Date('2020-01-02'));
	expect(network.changes[0].from.value).toEqual(oldOverlayVersionRange);
	expect(network.changes[0].to.value).toEqual(newOverlayVersionRange);
	network.updateOverlayVersionRange(
		newOverlayVersionRange,
		new Date('2020-01-03')
	);
	expect(network.changes.length).toEqual(1);
});

it('should update stellarCoreVersion and register the change', function () {
	const time = new Date('2020-01-01');
	const network = createNetwork(time);
	const oldStellarCoreVersion = network.stellarCoreVersion;
	const newStellarCoreVersionOrError = StellarCoreVersion.create('1.2.3');
	if (newStellarCoreVersionOrError.isErr())
		throw newStellarCoreVersionOrError.error;
	const newStellarCoreVersion = newStellarCoreVersionOrError.value;
	network.updateStellarCoreVersion(
		newStellarCoreVersion,
		new Date('2020-01-02')
	);
	expect(network.stellarCoreVersion.equals(newStellarCoreVersion)).toBeTruthy();
	expect(network.changes.length).toEqual(1);
	expect(network.changes[0]).toBeInstanceOf(NetworkStellarCoreVersionChanged);
	expect(network.changes[0].networkId.equals(network.networkId)).toBeTruthy();
	expect(network.changes[0].time).toEqual(new Date('2020-01-02'));
	expect(network.changes[0].from.value).toEqual(oldStellarCoreVersion);
	expect(network.changes[0].to.value).toEqual(newStellarCoreVersion);
	network.updateStellarCoreVersion(
		newStellarCoreVersion,
		new Date('2020-01-03')
	);
	expect(network.changes.length).toEqual(1);
});

it('should update quorumSetConfiguration and register change', function () {
	const time = new Date('2020-01-01');
	const network = Network.create(
		time,
		new NetworkId('test'),
		'public',
		createDummyNetworkProps()
	);
	const oldQuorumSetConfiguration = network.quorumSetConfiguration;
	const newQuorumSetConfiguration = new NetworkQuorumSetConfiguration(
		7,
		oldQuorumSetConfiguration.validators,
		oldQuorumSetConfiguration.innerQuorumSets
	);
	network.updateQuorumSetConfiguration(
		newQuorumSetConfiguration,
		new Date('2020-01-02')
	);
	expect(
		network.quorumSetConfiguration.equals(newQuorumSetConfiguration)
	).toBeTruthy();
	expect(network.changes.length).toEqual(1);
	expect(network.changes[0]).toBeInstanceOf(
		NetworkQuorumSetConfigurationChanged
	);
	expect(network.changes[0].networkId.equals(network.networkId)).toBeTruthy();
	expect(network.changes[0].time).toEqual(new Date('2020-01-02'));
	expect(network.changes[0].from.value).toEqual(oldQuorumSetConfiguration);
	expect(network.changes[0].to.value).toEqual(newQuorumSetConfiguration);
	network.updateQuorumSetConfiguration(
		newQuorumSetConfiguration,
		new Date('2020-01-03')
	);
	expect(network.changes.length).toEqual(1);
});

function createNetwork(time: Date) {
	return Network.create(
		time,
		new NetworkId('test'),
		'public',
		createDummyNetworkProps()
	);
}
