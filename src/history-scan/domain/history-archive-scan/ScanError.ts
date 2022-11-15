export enum ScanErrorType {
	TYPE_VERIFICATION,
	TYPE_CONNECTION,
	TYPE_TOO_SLOW
}
export class ScanError {
	constructor(
		public type: ScanErrorType,
		public url: string,
		public message?: string
	) {}
}
