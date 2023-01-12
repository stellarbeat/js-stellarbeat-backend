import { IdentifiedValueObject } from '../../../core/domain/IdentifiedValueObject';
import { Column, Entity } from 'typeorm';

export enum ScanErrorType {
	TYPE_VERIFICATION,
	TYPE_CONNECTION
}

@Entity({ name: 'history_archive_scan_error' })
export class ScanError extends IdentifiedValueObject implements Error {
	public readonly name = 'ScanError';

	@Column('enum', { enum: ScanErrorType, nullable: false })
	public readonly type: ScanErrorType;
	@Column('text', { nullable: false })
	public readonly url: string;
	@Column('text', { nullable: false })
	public readonly message: string;

	constructor(type: ScanErrorType, url: string, message: string) {
		super();
		this.type = type;
		this.url = url;
		this.message = message;
	}

	equals(other: this): boolean {
		return (
			this.type === other.type &&
			this.url === other.url &&
			this.message === other.message
		);
	}
}
