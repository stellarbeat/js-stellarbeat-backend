import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/*
@Deprecated
 */
@Entity()
export default class MeasurementRollup {
	@PrimaryGeneratedColumn()
	// @ts-ignore
	id: number;

	@Index()
	@Column('text')
	name: string;

	@Column('text', { nullable: false })
	targetTableName: String;

	@Column('bigint', { default: 0 })
	lastAggregatedCrawlId: number = 0;

	constructor(name: string, targetTableName: string) {
		this.name = name;
		this.targetTableName = targetTableName;
	}
}
