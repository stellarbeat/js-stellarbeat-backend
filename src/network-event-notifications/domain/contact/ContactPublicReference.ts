import { Column, Index } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export class ContactPublicReference {
	@Index()
	@Column({ type: 'uuid', nullable: false })
	public readonly value: string;

	private constructor(value: string) {
		this.value = value;
	}

	static create(value?: string) {
		if (!value) return new ContactPublicReference(uuidv4());
		else return new ContactPublicReference(value);
	}
}
