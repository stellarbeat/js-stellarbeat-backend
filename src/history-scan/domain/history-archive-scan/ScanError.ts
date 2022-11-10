import { Column } from 'typeorm';

export class ScanError {
	@Column('text')
	public url: string;

	@Column('text', { nullable: true })
	public message?: string;

	constructor(url: string, message?: string) {
		this.url = url;
		this.message = message;
	}
}

export class FileNotFoundError extends ScanError {
	constructor(url: string) {
		super(url, 'File not found');
	}
}

export class VerificationError extends ScanError {
	constructor(url: string) {
		super(url, 'Verification failed');
	}
}

export class ConnectionError extends ScanError {}

export class TooSlowError extends ScanError {
	constructor(url: string) {
		super(url, 'Archive too slow');
	}
}
