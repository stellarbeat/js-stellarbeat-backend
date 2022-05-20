export class HistoryArchiveScan {
	constructor(
		public readonly url: string,
		public readonly scanDate: Date,
		public readonly latestVerifiedLedger: number,
		public readonly hasGap: boolean,
		public readonly gapUrl?: string,
		public readonly gapCheckPoint?: number
	) {}
}
