import { Exclude, instanceToPlain } from 'class-transformer';
import { Column, Entity, ManyToOne, TableInheritance } from 'typeorm';
import { Change } from './Change';
import { VersionedNetwork } from './VersionedNetwork';
import { CoreEntity } from '../../core/domain/CoreEntity';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class NetworkChange extends CoreEntity implements Change {
	@Column({ type: 'jsonb', nullable: false })
	from: Record<string, unknown>;

	@Column({ type: 'jsonb', nullable: false })
	to: Record<string, unknown>;

	@Exclude()
	@ManyToOne(() => VersionedNetwork, (network) => network.snapshots)
	public readonly network: VersionedNetwork;

	constructor(network: VersionedNetwork, from: unknown, to: unknown) {
		super();
		this.network = network;
		this.from = instanceToPlain(from);
		this.to = instanceToPlain(to);
	}

	get time(): Date {
		return this.network.snapshotStartDate;
	}
}
