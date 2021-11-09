import { Column, Index } from 'typeorm';

export class ContactId {
	@Index()
	@Column({ type: 'uuid', nullable: false })
	public readonly value: string;

	constructor(rawId: string) {
		this.value = rawId;
	}
}
