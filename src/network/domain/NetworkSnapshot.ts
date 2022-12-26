import { Snapshot } from './Snapshot';
import { NetworkConfiguration } from './NetworkConfiguration';
import { Column, Entity, ManyToOne } from 'typeorm';
import { VersionedNetwork } from './VersionedNetwork';

@Entity()
export class NetworkSnapshot extends Snapshot {
	@Column(() => NetworkConfiguration)
	configuration: NetworkConfiguration;

	@ManyToOne(() => VersionedNetwork, (network) => network.snapshots)
	public network?: VersionedNetwork;

	constructor(startDate: Date, configuration: NetworkConfiguration) {
		super(startDate);
		this.configuration = configuration;
	}

	copy(startDate: Date): this {
		if (this.endDate !== Snapshot.MAX_DATE) {
			throw new Error('Cannot modify mid-chain');
		}
		return new NetworkSnapshot(startDate, this.configuration) as this;
	}

	containsUpdates(base: this): boolean {
		return !this.configuration.equals(base.configuration);
	}
}
