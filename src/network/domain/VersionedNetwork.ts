import { NetworkId } from './NetworkId';
import { NetworkConfiguration } from './NetworkConfiguration';
import { Column, Entity, OneToMany } from 'typeorm';
import { Version } from './Version';
import { IdentifiedEntity } from '../../core/domain/IdentifiedEntity';
import { NetworkConfigurationChange } from './NetworkConfigurationChange';
import { NetworkChange } from './NetworkChange';

@Entity('network')
export class VersionedNetwork extends IdentifiedEntity {
	@Column(() => Version)
	private version: Version;

	@OneToMany(() => NetworkChange, (change) => change.network, { cascade: true })
	private _changes?: NetworkChange[];

	@Column(() => NetworkConfiguration)
	private _configuration: NetworkConfiguration;

	@Column(() => NetworkId)
	public readonly networkId: NetworkId;

	private constructor(
		networkId: NetworkId,
		configuration: NetworkConfiguration,
		version: Version
	) {
		super();
		this.version = version;
		this._configuration = configuration;
		this.networkId = networkId;
	}

	static create(
		networkId: NetworkId,
		configuration: NetworkConfiguration,
		startDate: Date = new Date()
	) {
		const snapshot = Version.createInitial(startDate);
		return new VersionedNetwork(networkId, configuration, snapshot);
	}

	updateConfiguration(configuration: NetworkConfiguration) {
		if (this._configuration.equals(configuration)) {
			return;
		}

		const change = new NetworkConfigurationChange(
			this,
			this._configuration,
			configuration
		);
		this.changes.push(change);
		this._configuration = configuration;
	}

	archiveThisVersion(endDate: Date) {
		this.version.endDate = endDate;
	}

	createNewVersion(startDate: Date) {
		this.detach();
		this.version = this.version.createNextVersion(startDate);
		this.changes.length = 0;
	}

	get startDate() {
		return this.version.startDate;
	}

	get endDate() {
		return this.version.endDate;
	}

	get configuration(): NetworkConfiguration {
		return this._configuration;
	}

	previousVersionShouldBeArchived(): boolean {
		return !this.version.isInitial && this.changes.length !== 0;
	}

	get changes(): NetworkChange[] {
		if (!this._changes) {
			this._changes = [];
		}
		return this._changes;
	}
}
