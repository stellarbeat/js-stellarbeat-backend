import { PrimaryGeneratedColumn } from 'typeorm';
import { ValueObject } from './ValueObject';

//If you want to store a value object in database in a separate column, but not expose its internal db id, use this class.
export abstract class IdentifiedValueObject extends ValueObject {
	@PrimaryGeneratedColumn({ name: 'id' })
	protected readonly id?: number;

	abstract equals(other: this): boolean;
}
