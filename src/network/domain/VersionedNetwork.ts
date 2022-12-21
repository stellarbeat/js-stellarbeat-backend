import { NetworkId } from './NetworkId';
import { NetworkConfiguration } from './NetworkConfiguration';
import { Column, Entity } from 'typeorm';
import { Version } from './Version';
import { IdentifiedEntity } from '../../core/domain/IdentifiedEntity';

@Entity()
export class VersionedNetwork extends IdentifiedEntity {
	@Column(() => Version)
	private version: Version;

	@Column(() => NetworkConfiguration)
	private configuration: NetworkConfiguration;

	@Column(() => NetworkId)
	public readonly networkId: NetworkId;

	private constructor(
		networkId: NetworkId,
		configuration: NetworkConfiguration,
		version: Version = new Version()
	) {
		super();
		this.version = version;
		this.configuration = configuration;
		this.networkId = networkId;
	}

	static createInitialVersion(
		networkId: NetworkId,
		configuration: NetworkConfiguration
	) {
		const snapshot = Version.createNew();
		return new VersionedNetwork(networkId, configuration, snapshot);
	}

	updateConfiguration(configuration: NetworkConfiguration) {
		this.configuration = configuration;
		this.version.modify();
	}

	previousVersionShouldBeArchived() {
		return this.version.previousVersionShouldBeArchived();
	}

	archiveThisVersion(endDate: Date) {
		this.version.endDate = endDate;
	}

	createNewVersion() {
		this.id = undefined;
	}

	get endDate() {
		return this.version.endDate;
	}
}
