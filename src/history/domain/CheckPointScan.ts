import { CheckPoint } from './CheckPoint';

export enum ScanStatus {
	unknown = 'unknown',
	present = 'present',
	missing = 'missing',
	timedOut = 'timeout'
}

//Scan determines if necessary files are present. Verification not yet implemented
export class CheckPointScan {
	attempt = 0;
	ledgerCategoryScanStatus = ScanStatus.unknown;
	historyCategoryScanStatus = ScanStatus.unknown;
	transactionsCategoryScanStatus = ScanStatus.unknown;
	resultsCategoryScanStatus = ScanStatus.unknown;

	constructor(public readonly checkPoint: CheckPoint) {}

	scanCompleted(): boolean {
		return (
			this.ledgerCategoryScanStatus !== ScanStatus.unknown &&
			this.ledgerCategoryScanStatus !== ScanStatus.timedOut &&
			this.historyCategoryScanStatus !== ScanStatus.unknown &&
			this.historyCategoryScanStatus !== ScanStatus.timedOut &&
			this.transactionsCategoryScanStatus !== ScanStatus.unknown &&
			this.transactionsCategoryScanStatus !== ScanStatus.timedOut &&
			this.resultsCategoryScanStatus !== ScanStatus.unknown &&
			this.resultsCategoryScanStatus !== ScanStatus.timedOut
		);
	}
}
