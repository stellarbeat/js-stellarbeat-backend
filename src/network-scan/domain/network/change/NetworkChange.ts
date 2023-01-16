import { Column, Entity, ManyToOne, TableInheritance } from 'typeorm';
import { CoreEntity } from '../../../../core/domain/CoreEntity';
import { Change } from '../../Change';
import { NetworkId } from '../NetworkId';
import { Network } from '../Network';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class NetworkChange extends CoreEntity implements Change {
	@ManyToOne(() => Network, {
		nullable: false
	})
	public network?: Network;

	@Column('timestamptz')
	time: Date;

	@Column({ type: 'jsonb', nullable: false })
	from: Record<string, unknown>;

	@Column({ type: 'jsonb', nullable: false })
	to: Record<string, unknown>;

	@Column(() => NetworkId)
	public readonly networkId: NetworkId;

	protected constructor(
		networkId: NetworkId,
		time: Date,
		from: Record<string, unknown>,
		to: Record<string, unknown>
	) {
		super();
		this.networkId = networkId;
		this.time = time;
		this.from = from;
		this.to = to;
	}
}
