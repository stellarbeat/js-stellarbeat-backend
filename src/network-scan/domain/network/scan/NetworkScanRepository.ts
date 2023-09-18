import NetworkScan from './NetworkScan';

export interface NetworkScanRepository {
	findLatestSuccessfulScanTime(): Promise<Date | undefined>;

	findLatest(): Promise<NetworkScan | undefined>;

	findAt(at: Date): Promise<NetworkScan | undefined>;

	findPreviousAt(at: Date): Promise<NetworkScan | undefined>;

	saveOne(scan: NetworkScan): Promise<NetworkScan>;

	save(scans: NetworkScan[]): Promise<NetworkScan[]>;
}
