import { ScanError } from './ScanError';
import { LedgerHeader } from '../scanner/Scanner';

export interface ScanResult {
	readonly latestLedgerHeader: LedgerHeader;
	readonly error?: ScanError;
}
