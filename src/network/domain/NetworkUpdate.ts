import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	Index,
	ValueTransformer
} from 'typeorm';

export const bigIntTransformer: ValueTransformer = {
	to: (entityValue: bigint) => entityValue,
	from: (databaseValue: string): bigint => BigInt(databaseValue)
};
//Todo: network update data should be incorporated into network domain class. Then we can move this entity to infra/database
@Entity()
@Index(['time', 'completed'])
export default class NetworkUpdate {
	@PrimaryGeneratedColumn()
	// @ts-ignore
	id: number;

	@Column('timestamptz')
	time: Date = new Date();

	@Column('simple-array', { default: '' })
	ledgers: number[];

	@Column('bigint', {
		default: 0,
		transformer: bigIntTransformer,
		nullable: false
	})
	latestLedger = BigInt(0);

	@Column('timestamptz', { nullable: false, default: new Date(0) })
	latestLedgerCloseTime: Date = new Date(0);

	@Column('boolean', { default: false })
	completed = false;

	constructor(time: Date = new Date(), ledgers: number[] = []) {
		this.time = time;
		this.ledgers = ledgers;
	}

	toString(): string {
		return `Crawl (id: ${this.id}, time: ${this.time})`;
	}
}
