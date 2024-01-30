export interface IHashCalculationPolicy {
	calculateHash(previousLedgerHeaderHash: string | undefined): string;
}
