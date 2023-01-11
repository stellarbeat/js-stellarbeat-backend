import { Column } from 'typeorm';
import { ValueObject } from '../../../core/domain/ValueObject';

export class NetworkId extends ValueObject {
	@Column({ type: 'varchar', nullable: false })
	public readonly value: string;

	constructor(value: string) {
		super();
		this.value = value;
	}
}
