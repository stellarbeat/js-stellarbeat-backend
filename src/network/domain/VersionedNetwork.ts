import { NetworkId } from './NetworkId';
import { NetworkConfiguration } from './NetworkConfiguration';
import { Column, Entity, OneToMany } from 'typeorm';
import { VersionedEntity } from './VersionedEntity';
import { NetworkConfigurationChange } from './NetworkConfigurationChange';
import { NetworkChange } from './NetworkChange';

@Entity('network')
export class VersionedNetwork extends VersionedEntity {
	@OneToMany(() => NetworkChange, (change) => change.network, {
		cascade: true,
		eager: true
	})
	protected _changes?: NetworkChange[];

	@Column(() => NetworkConfiguration)
	private _configuration: NetworkConfiguration;

	@Column(() => NetworkId)
	public readonly networkId: NetworkId;

	constructor(
		networkId: NetworkId,
		configuration: NetworkConfiguration,
		startDate: Date
	) {
		super(startDate);
		this._configuration = configuration;
		this.networkId = networkId;
	}

	protected cloneWithNewStartDate(startDate: Date): this {
		return new VersionedNetwork(
			this.networkId,
			this.configuration,
			startDate
		) as this;
	}

	updateConfiguration(configuration: NetworkConfiguration) {
		if (this._configuration.equals(configuration)) {
			return;
		}

		this.registerChange(
			new NetworkConfigurationChange(this, this._configuration, configuration)
		);
		this._configuration = configuration;
	}

	get configuration(): NetworkConfiguration {
		return this._configuration;
	}
}
