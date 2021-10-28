import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

/*
@Deprecated
 */
@Entity()
export default class NetworkMeasurementUpdate {
	@PrimaryGeneratedColumn()
	// @ts-ignore
	id: number;

	@Column('int', { default: 0 })
	startCrawlId = 0;
	@Column('int', { default: 0 })
	endCrawlId = 0;
}
