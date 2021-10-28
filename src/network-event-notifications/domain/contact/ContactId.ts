import { Column } from 'typeorm';

export class ContactId {
	@Column({ type: 'uuid', nullable: false, name: 'contact_id' })
	public readonly value: string;

	constructor(rawId: string) {
		this.value = rawId;
	}
}
