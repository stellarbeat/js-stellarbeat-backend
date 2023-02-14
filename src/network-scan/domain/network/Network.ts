import { NetworkId } from './NetworkId';
import { Column, Entity, OneToMany, Unique } from 'typeorm';
import { VersionedEntity } from '../../../core/domain/VersionedEntity';
import { OverlayVersionRange } from './OverlayVersionRange';
import { NetworkSnapshot } from './NetworkSnapshot';
import { StellarCoreVersion } from './StellarCoreVersion';
import { NetworkQuorumSetConfiguration } from './NetworkQuorumSetConfiguration';
import { NetworkChange } from './change/NetworkChange';
import { NetworkMaxLedgerVersionChanged } from './change/NetworkMaxLedgerVersionChanged';
import { NetworkNameChanged } from './change/NetworkNameChanged';
import { NetworkOverlayVersionRangeChanged } from './change/NetworkOverlayVersionRangeChanged';
import { NetworkStellarCoreVersionChanged } from './change/NetworkStellarCoreVersionChanged';
import { NetworkQuorumSetConfigurationChanged } from './change/NetworkQuorumSetConfigurationChanged';

export interface NetworkProps {
	name: string;
	overlayVersionRange: OverlayVersionRange;
	stellarCoreVersion: StellarCoreVersion;
	maxLedgerVersion: number;
	quorumSetConfiguration: NetworkQuorumSetConfiguration;
}

@Entity('network')
@Unique(['networkId.value'])
export class Network extends VersionedEntity<NetworkSnapshot> {
	@Column(() => NetworkId)
	public readonly networkId: NetworkId;

	@Column({ type: 'text', nullable: false })
	public readonly passphrase: string;

	@OneToMany(() => NetworkChange, (change) => change.network, {
		cascade: false,
		nullable: false
	})
	protected _changes?: NetworkChange[];

	@OneToMany(() => NetworkSnapshot, (snapshot) => snapshot.network, {
		cascade: false,
		nullable: false
	})
	protected _snapshots?: NetworkSnapshot[];

	public get changes(): NetworkChange[] {
		if (!this._changes) {
			throw new Error('Changes not hydrated');
		}
		return this._changes;
	}

	get overlayVersionRange(): OverlayVersionRange {
		return this.currentSnapshot().overlayVersionRange;
	}

	updateOverlayVersionRange(
		overlayVersionRange: OverlayVersionRange,
		time: Date
	) {
		if (this.overlayVersionRange.equals(overlayVersionRange)) {
			return;
		}
		this.changes.push(
			new NetworkOverlayVersionRangeChanged(
				this.networkId,
				time,
				this.overlayVersionRange,
				overlayVersionRange
			)
		);
		this.addSnapshotIfNotExistsFor(time);

		this.currentSnapshot().overlayVersionRange = overlayVersionRange;
	}

	get maxLedgerVersion(): number {
		return this.currentSnapshot().maxLedgerVersion;
	}

	updateMaxLedgerVersion(ledgerVersion: number, time: Date) {
		if (this.maxLedgerVersion === ledgerVersion) {
			return;
		}
		this.addSnapshotIfNotExistsFor(time);
		this.changes.push(
			new NetworkMaxLedgerVersionChanged(
				this.networkId,
				time,
				this.maxLedgerVersion,
				ledgerVersion
			)
		);
		this.currentSnapshot().maxLedgerVersion = ledgerVersion;
	}

	get name(): string {
		return this.currentSnapshot().name;
	}

	updateName(name: string, time: Date) {
		if (this.name === name) {
			return;
		}
		this.addSnapshotIfNotExistsFor(time);
		this.changes.push(
			new NetworkNameChanged(this.networkId, time, this.name, name)
		);
		this.currentSnapshot().name = name;
	}

	get stellarCoreVersion(): StellarCoreVersion {
		return this.currentSnapshot().stellarCoreVersion;
	}

	updateStellarCoreVersion(stellarCoreVersion: StellarCoreVersion, time: Date) {
		if (this.stellarCoreVersion.equals(stellarCoreVersion)) {
			return;
		}
		this.changes.push(
			new NetworkStellarCoreVersionChanged(
				this.networkId,
				time,
				this.stellarCoreVersion,
				stellarCoreVersion
			)
		);
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().stellarCoreVersion = stellarCoreVersion;
	}

	get quorumSetConfiguration(): NetworkQuorumSetConfiguration {
		return this.currentSnapshot().quorumSetConfiguration;
	}

	updateQuorumSetConfiguration(
		quorumSetConfiguration: NetworkQuorumSetConfiguration,
		time: Date
	) {
		if (
			this.currentSnapshot().quorumSetConfigurationHash ===
			quorumSetConfiguration.hash()
		) {
			return;
		}
		this.changes.push(
			new NetworkQuorumSetConfigurationChanged(
				this.networkId,
				time,
				this.quorumSetConfiguration,
				quorumSetConfiguration
			)
		);
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().quorumSetConfiguration = quorumSetConfiguration;
		this.currentSnapshot().quorumSetConfigurationHash =
			quorumSetConfiguration.hash();
	}

	protected constructor(
		networkId: NetworkId,
		passphrase: string,
		snapshots: [NetworkSnapshot],
		changes: NetworkChange[]
	) {
		super(snapshots);
		this.networkId = networkId;
		this.passphrase = passphrase;
		this._changes = changes;
	}

	static create(
		time: Date,
		networkId: NetworkId,
		passphrase: string,
		networkProps: NetworkProps
	): Network {
		return new Network(
			networkId,
			passphrase,
			[
				new NetworkSnapshot(
					time,
					networkProps.name,
					networkProps.maxLedgerVersion,
					networkProps.overlayVersionRange,
					networkProps.stellarCoreVersion,
					networkProps.quorumSetConfiguration,
					networkProps.quorumSetConfiguration.hash()
				)
			],
			[]
		);
	}
}
