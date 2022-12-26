import { NetworkId } from './NetworkId';
import { NetworkConfiguration } from './NetworkConfiguration';
import { Column, Entity, OneToMany } from 'typeorm';
import { VersionedEntity } from './VersionedEntity';
import { NetworkSnapshot } from './NetworkSnapshot';

@Entity('network')
export class VersionedNetwork extends VersionedEntity<NetworkSnapshot> {
	@Column(() => NetworkId)
	public readonly networkId: NetworkId;

	@Column({ type: 'text' })
	public readonly name: string;

	@OneToMany(() => NetworkSnapshot, (snapshot) => snapshot.network, {
		cascade: true,
		nullable: false
	})
	protected _snapshots?: NetworkSnapshot[];

	get snapshotStartDate(): Date {
		return this.currentSnapshot().startDate;
	}

	get snapshotEndDate(): Date {
		return this.currentSnapshot().endDate;
	}

	get configuration(): NetworkConfiguration {
		return this.currentSnapshot().configuration;
	}

	protected constructor(
		networkId: NetworkId,
		name: string,
		snapshots: NetworkSnapshot[]
	) {
		super(snapshots);
		this.networkId = networkId;
		this.name = name;
	}

	static create(
		time: Date,
		networkId: NetworkId,
		name: string,
		configuration: NetworkConfiguration
	): VersionedNetwork {
		return new VersionedNetwork(networkId, name, [
			new NetworkSnapshot(time, configuration)
		]);
	}
}
