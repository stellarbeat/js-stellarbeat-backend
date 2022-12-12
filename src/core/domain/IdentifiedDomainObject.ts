import { PrimaryGeneratedColumn } from 'typeorm';

//id of entity inside of database (Surrogate identity), not to be used inside of domain.
export abstract class IdentifiedDomainObject {
	@PrimaryGeneratedColumn()
	private id?: number; //marked private as to not expose it to clients
}
