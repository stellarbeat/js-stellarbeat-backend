import { Column } from 'typeorm';

export class ContactId {
	@Column({ type: 'uuid', nullable: false })
	public readonly value: string;

	constructor(rawId: string) {
		this.value = rawId;
	}
}
