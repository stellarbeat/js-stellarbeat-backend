import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export default class TimeTravelMigration {
	@PrimaryGeneratedColumn()
	// @ts-ignore
	id: number;

	@Column('integer')
	lastMigratedCrawl = 0;
}
