import { PrimaryGeneratedColumn } from 'typeorm';

//represents a class that has a lifecycle with an internal id, not to be exposed to clients
export abstract class CoreEntity {
	@PrimaryGeneratedColumn({ name: 'id' })
	private internalId?: number; //marked private as to not expose it to clients
}
