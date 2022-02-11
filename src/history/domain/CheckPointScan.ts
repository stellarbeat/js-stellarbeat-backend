import { CheckPoint } from './CheckPoint';

export enum ScanStatus {
	unknown = 'unknown',
	present = 'present',
	missing = 'missing',
	error = 'error'
}

//Scan determines if necessary files are present. Verification not yet implemented
export class CheckPointScan {
	attempt = 0;
	ledgerCategoryScanStatus = ScanStatus.unknown;
	historyCategoryScanStatus = ScanStatus.unknown;
	transactionsCategoryScanStatus = ScanStatus.unknown;
	resultsCategoryScanStatus = ScanStatus.unknown;

	constructor(public readonly checkPoint: CheckPoint) {}

	hasErrors(): boolean {
		return (
			this.ledgerCategoryScanStatus === ScanStatus.error ||
			this.historyCategoryScanStatus === ScanStatus.error ||
			this.resultsCategoryScanStatus === ScanStatus.error ||
			this.transactionsCategoryScanStatus === ScanStatus.error
		);
	}

	hasGaps(): boolean {
		return (
			this.ledgerCategoryScanStatus === ScanStatus.missing ||
			this.historyCategoryScanStatus === ScanStatus.missing ||
			this.resultsCategoryScanStatus === ScanStatus.missing ||
			this.transactionsCategoryScanStatus === ScanStatus.missing
		);
	}
}
