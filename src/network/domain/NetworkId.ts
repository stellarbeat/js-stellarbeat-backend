import { IdentifiedValueObject } from '../../core/domain/IdentifiedValueObject';
import { Column, Index } from 'typeorm';

export class NetworkId extends IdentifiedValueObject {
	@Index()
	@Column({ type: 'varchar', nullable: false, name: 'networkId' })
	public readonly value: string;

	constructor(value: string) {
		super();
		this.value = value;
	}
}
